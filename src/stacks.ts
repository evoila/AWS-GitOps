import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';

import * as libBase from './lib/base';
import * as libPlatformsGitHub from './lib/platforms/GitHub';
import * as libWorkload from './lib/workload';
import * as libWorkloadsProdTest from './lib/workloads/prod-test';


export
interface OrganizationBootstrapStackProps
extends cdk.StackProps
{
	lookupAccountIds : string[];
	organizationManagementAccountId : string;
	regions : string[];
	workloadsOrganizationalUnitId : string;
};

export
class OrganizationBootstrapStack
extends cdk.Stack
{
	public readonly cdkBootstrapQualifier : string;
	public readonly organizationalUnitId : string;

	constructor
	(
		scope: constructs.Construct,
		id: string,
		props: OrganizationBootstrapStackProps,
	)
	{
		super(
			scope,
			id,
			props,
		);

		const construct = new libBase.OrganizationalUnit(
			this,
			'Default',
			'GitOps',
			props.workloadsOrganizationalUnitId,
			props.regions,
			[
				props.organizationManagementAccountId,
			],
			props.lookupAccountIds,
		);
		construct.organizationalUnit.overrideLogicalId(
			'OrganizationalUnit',
		);
		construct.cdkBootstrapStackSet.overrideLogicalId(
			'CDKToolkitStackSet',
		);

		this.cdkBootstrapQualifier = construct.cdkBootstrapQualifier;
		this.organizationalUnitId = construct.organizationalUnitId;
	};
};

export
class GitHubOpenIdConnectProviderStack
extends cdk.Stack
{
	public readonly openIdConnectProvider : libPlatformsGitHub.OpenIdConnectProvider;

	constructor
	(
		scope: constructs.Construct,
		id: string,
		props: cdk.StackProps,
		openIdConnectProviderProps: libPlatformsGitHub.OpenIdConnectProviderProps = {
			type : 'cloud',
		},
	)
	{
		super(
			scope,
			id,
			props,
		);

		this.openIdConnectProvider = new libPlatformsGitHub.OpenIdConnectProvider(
			this,
			'identity provider',
			openIdConnectProviderProps,
		);
		(this.openIdConnectProvider.node.defaultChild as cdk.CfnResource).overrideLogicalId(
			'IdentityProvider',
		);
	};
};

interface ProdTestWorkloadStackProps
extends
	cdk.StackProps
	,
	libWorkloadsProdTest.ProdTestWorkloadProps
{
	AwsCdkBootstrapQualifier: string;
	emailAddressConstructor : libWorkload.AccountEmailAddressConstructor;
	name : string;
	parentOrganizationalUnitId : string;
};

export
interface GitHubProdTestWorkloadStackProps
extends
	ProdTestWorkloadStackProps
	,
	libWorkloadsProdTest.GitHubProdTestWorkloadProps
{
	openIdConnectProvider : libPlatformsGitHub.OpenIdConnectProvider;
	repository : libPlatformsGitHub.RepositoryProps;
};

export
class GitHubProdTestWorkloadStack
extends cdk.Stack
{
	constructor
	(
		scope: constructs.Construct,
		id: string,
		props: GitHubProdTestWorkloadStackProps,
	)
	{
		super(
			scope,
			id,
			props,
		);

		const construct = new libWorkloadsProdTest.GitHubProdTestWorkload(
			this,
			'Default',
			//props,
			{
				...props,
				reusableWorkflowsTest: {
					repository: {
						owner: 'evoila',
						name: 'GitHub-Actions',
					},
					branches: [
						// FIXME: This is a security hazard
						'*',
					],
					tags: [
						// FIXME: This is a security hazard
						'*',
					],
				},
				reusableWorkflowsProd: {
					repository: {
						owner: 'evoila',
						name: 'GitHub-Actions',
					},
					tags: [
						// FIXME: This is a security hazard
						'v*',
					],
				},
			},
		);
		construct.organizationalUnit.overrideLogicalId(
			'OrganizationalUnit',
		);
		construct.prodAccount.overrideLogicalId(
			'ProdAccount',
		);
		construct.prodRole.overrideLogicalId(
			'ProdRole',
		);
		construct.testAccount.overrideLogicalId(
			'TestAccount',
		);
		construct.testRole.overrideLogicalId(
			'TestRole',
		);

		new cdk.CfnOutput(
			this,
			'ProdAccountId',
			{
				description: 'ID of the prod account',
				value: construct.prodAccountId,
			},
		);
		new cdk.CfnOutput(
			this,
			'ProdRoleName',
			{
				description: `Name of the IAM role that lets ${construct.prodPrincipalDescription} deploy CDK apps in the prod account`,
				value: construct.prodRoleName,
			},
		);
		new cdk.CfnOutput(
			this,
			'TestAccountId',
			{
				description: 'ID of the test account',
				value: construct.testAccountId,
			},
		);
		new cdk.CfnOutput(
			this,
			'TestRoleName',
			{
				description: `Name of the IAM role that lets ${construct.testPrincipalDescription} deploy CDK apps in the test account`,
				value: construct.testRoleName,
			},
		);
	};
};
