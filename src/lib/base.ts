import * as fs from 'fs';

import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';
//import * as cdk_cli from 'aws-cdk/lib/api/bootstrap';


export
class OrganizationalUnit
extends constructs.Construct
{
	public readonly cdkBootstrapQualifier : string;
	public readonly cdkBootstrapStackSet : cdk.aws_cloudformation.CfnStackSet;
	public readonly organizationalUnit : cdk.aws_organizations.CfnOrganizationalUnit;
	public readonly organizationalUnitId : string;

	/**
	 * 
	 * @param scope 
	 * @param id 
	 * @param name Name of the organizational unit.
	 * @param parentOrganizationalUnitId ID of the organizational unit under which to place the organizational unit.
	 * @param regions AWS regions in which to enable the CDK.
	 * @param accountsTrustedForDeployments IDs of the AWS accounts
	 * @param accountsTrustedForLookups IDs of the AWS accounts whose principals will be allowed to perform lookups with the CDK command-line interface.
	 */
	constructor(
		scope: constructs.Construct,
		id: string,
		name : string,
		parentOrganizationalUnitId : string,
		regions : string[],
		accountsTrustedForDeployments : string[],
		accountsTrustedForLookups : string[],
	)
	{
		super(
			scope,
			id,
		);

		this.organizationalUnit = new cdk.aws_organizations.CfnOrganizationalUnit(
			this,
			'organizational unit',
			{
				name: name,
				parentId: parentOrganizationalUnitId,
			},
		);
		this.organizationalUnitId = this.organizationalUnit.attrId;

		const stackSetProtectionPolicy = new cdk.aws_organizations.CfnPolicy(
			this,
			'stack set protection policy',
			{
				content: new cdk.aws_iam.PolicyDocument(
					{
						statements: [
							new cdk.aws_iam.PolicyStatement(
								{
									notActions: [
										'cloudformation:DescribeStackEvents',
										'cloudformation:DescribeStackResource',
										'cloudformation:DescribeStackResourceDrifts',
										'cloudformation:DescribeStackResources',
										'cloudformation:DescribeStacks',
										'cloudformation:DetectStackDrift',
										'cloudformation:DetectStackResourceDrift',
										'cloudformation:GetStackPolicy',
										'cloudformation:GetTemplate',
										'cloudformation:GetTemplateSummary',
										'cloudformation:ListChangeSets',
										'cloudformation:ListStackResources',
									],
									resources: [
										cdk.Arn.format(
											{
												account: '*',
												partition: '*',
												region: '*',
												resource: 'stack',
												resourceName: 'StackSet-*',
												service: 'cloudformation',
											},
										),
									],
									conditions: {
										ArnNotLike: {
											'aws:PrincipalARN': [
												cdk.Arn.format(
													{
														account: '*',
														partition: '*',
														region: '',
														resource: 'role',
														resourceName: 'aws-service-role/organizations.amazonaws.com/AWSServiceRoleForOrganizations',
														service: 'iam',
													},
												),
												cdk.Arn.format(
													{
														account: '*',
														partition: '*',
														region: '',
														resource: 'role',
														// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-enable-trusted-access
														// > The IAM service-linked role created in each target account has the suffix `CloudFormationStackSetsOrgMember`.
														//resourceName: '*CloudFormationStackSetsOrgMember',
														resourceName: 'aws-service-role/member.org.stacksets.cloudformation.amazonaws.com/AWSServiceRoleForCloudFormationStackSetsOrgMember',
														service: 'iam',
													},
												),
											],
										},
									},
									effect: cdk.aws_iam.Effect.DENY,
								},
							),
						],
					},
				),
				description: 'Protect stack sets',
				name: 'StackSetProtection',
				targetIds: [
					this.organizationalUnitId,
				],
				type: 'SERVICE_CONTROL_POLICY',
			},
		);

		/*
		let AWSCDKBootstrapper = new cdk_cli.Bootstrapper(
			{
				source: 'default',
			},
		);
		let template = AWSCDKBootstrapper.showTemplate(
			false,
		);
		*/
		// FIXME: turn package `aws-cdk` into a runtime dependency (i.e. move from `devDependencies` into `dependencies`)
		const path = require.resolve(
			'aws-cdk/lib/api/bootstrap/bootstrap-template.yaml',
		);
		const templateBuffer = fs.readFileSync(
			path,
		);
		const template = templateBuffer.toString(
		);

		this.cdkBootstrapQualifier = cdk.DefaultStackSynthesizer.DEFAULT_QUALIFIER;
		// Managed policies to attach to the role assumed by CloudFormation on behalf of the CDK
		const cloudFormationExecutionPolicies = [
			cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
				'AdministratorAccess',
			),
		];

		// https://aws.amazon.com/blogs/mt/bootstrapping-multiple-aws-accounts-for-aws-cdk-using-cloudformation-stacksets/
		this.cdkBootstrapStackSet = new cdk.aws_cloudformation.CfnStackSet(
			this,
			'CDK bootstrap',
			{
				autoDeployment: {
					enabled: true,
					retainStacksOnAccountRemoval: true,
				},
				// > To create a stack set with service-managed permissions while signed in to the management account, specify `SELF`.
				callAs: 'SELF',
				capabilities: [
					// The CDK requires fixed names on its roles
					'CAPABILITY_NAMED_IAM',
				],
				//description: 'AWS CDK bootstrap',
				description: 'Resources required by the AWS CDK',
				//description: 'Resources required to deploy AWS CDK apps',
				managedExecution: {
					Active: true,
				},
				parameters: [
					{
						parameterKey: 'Qualifier',
						parameterValue: this.cdkBootstrapQualifier,
					},
					{
						parameterKey: 'TrustedAccounts',
						parameterValue: accountsTrustedForDeployments.join(
							',',
						),
					},
					{
						parameterKey: 'TrustedAccountsForLookup',
						parameterValue: accountsTrustedForLookups.join(
							',',
						),
					},
					{
						// the template grants no permissions to the role `CloudFormationExecutionRole`
						parameterKey: 'CloudFormationExecutionPolicies',
						parameterValue: (
							cloudFormationExecutionPolicies
							.map(
								(
									managedPolicy,
								) =>
								managedPolicy.managedPolicyArn,
							)
							.join(
								',',
							)
						),
					},
				],
				permissionModel: 'SERVICE_MANAGED',
				stackInstancesGroup: [
					{
						deploymentTargets: {
							organizationalUnitIds: [
								this.organizationalUnitId,
							],
						},
						regions: regions,
					},
				],
				// > The required resources are defined in an AWS CloudFormation stack, called the _bootstrap stack_, which is usually named `CDKToolkit`.
				stackSetName: 'CDKToolkit',
				templateBody: template,
			},
		);
	};
};
