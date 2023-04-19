import * as node_crypto from 'node:crypto';

import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';


export
abstract class OpenIdConnectProvider
extends constructs.Construct
{
	// public abstract readonly openIdConnectProvider : cdk.aws_iam.OpenIdConnectProvider;
	// public abstract readonly openIdConnectProvider : cdk.aws_iam.CfnOIDCProvider;
	public abstract readonly openIdConnectProvider : cdk.aws_iam.IOpenIdConnectProvider;

	// public readonly ARN : string;

	/*
	public abstract generateTrustPolicyForAllBranchesExcept(
		repository: qwerty,
		branches: string[],
	)
	: cdk.aws_iam.IAssumeRolePrincipal

	public abstract generateTrustPolicyForSomeBranches(
		repository: qwerty,
		branches: string[],
	)
	: cdk.aws_iam.IAssumeRolePrincipal
	*/

	// Base64
	protected getOpenIdConnectIssuerEncodedTlsCertificates
	(
		openIdConnectIssuerHost : string,
	)
	: string[]
	{
		const encodedTlsCertificates = cdk.ContextProvider.getValue(
			this,
			{
				/*
				dummyValue: {
					tlsCertificateThumbprints : [
					],
				} as self_platform.ContextResponse,
				*/
				dummyValue: [
				],
				includeEnvironment: false,
				props: {
					host : openIdConnectIssuerHost,
					pluginName : 'OpenID Connect issuer TLS certificates',
				},
				provider: 'plugin',
			},
		);
		return encodedTlsCertificates.value!;
	}

	protected getOpenIdConnectIssuerTlsCertificates
	(
		openIdConnectIssuerHost : string,
	)
	: Buffer[]
	{
		const encodedTlsCertificates = this.getOpenIdConnectIssuerEncodedTlsCertificates(
			openIdConnectIssuerHost,
		);
		const tlsCertificates = encodedTlsCertificates.map(
			(
				encodedTlsCertificate : string,
			) =>
			Buffer.from(
				encodedTlsCertificate,
				'base64',
			),
		);
		return tlsCertificates;
	};

	protected getOpenIdConnectIssuerTlsCertificateThumbprints
	(
		openIdConnectIssuerHost : string,
	)
	: string[]
	{
		const tlsCertificates = this.getOpenIdConnectIssuerTlsCertificates(
			openIdConnectIssuerHost,
		);
		const tlsCertificateThumbprints = tlsCertificates.map(
			(
				tlsCertificate,
			) =>
			{
				const hash = node_crypto.createHash(
					// AWS OpenID Connect providers require SHA-1 fingerprints and do not allow any other hash algorithm, like SHA-256 or SHA-512
					'sha1',
				);
				hash.update(
					tlsCertificate,
				);
				const tlsCertificateHashSum = hash.digest(
					'hex',
				);
				return tlsCertificateHashSum;
			},
		);
		return tlsCertificateThumbprints;
	};
};

export
interface AWSCDKAccessRoleProps
{
	AwsCdkBootstrapQualifier : string;
	path ?: string;
	principal : cdk.aws_iam.IPrincipal;
	principalDescription : string;
	targetAccount : string;
};

/**
 * IAM role that the AWS CDK can use to deploy into the specified account.
 */
export
class AWSCDKAccessRole
extends constructs.Construct
{
	// IAM roles which the AWS CDK will be allowed to assume.
	// CI/CD doesn't need to assume the lookup role, because it shouldn't perform lookups;
	// instead, lookups should be performed by developers.
	static readonly #roleNames = [
		'deploy',
		'file-publishing',
		'image-publishing',
	];

	public readonly role : cdk.aws_iam.Role;

	constructor
	(
		scope: constructs.Construct,
		id: string,
		props: AWSCDKAccessRoleProps,
	)
	{
		super(
			scope,
			id,
		);

		this.role = new cdk.aws_iam.Role(
			this,
			'role',
			{
				assumedBy: props.principal,
				description: `Lets ${props.principalDescription} deploy CDK apps in the AWS account \`${props.targetAccount}\``,
				inlinePolicies: {
					'AWS-CDK': new cdk.aws_iam.PolicyDocument(
						{
							statements: AWSCDKAccessRole.#roleNames.map(
								(
									roleName,
								) =>
								new cdk.aws_iam.PolicyStatement(
									{
										actions: [
											'sts:AssumeRole',
										],
										resources: [
											cdk.Arn.format(
												{
													account: props.targetAccount,
													//arnFormat: cdk.ArnFormat.SLASH_RESOURCE_SLASH_RESOURCE_NAME,
													partition: cdk.Aws.PARTITION,
													region: '',
													resource: 'role',
													resourceName: `cdk-${props.AwsCdkBootstrapQualifier}-${roleName}-role-${props.targetAccount}-*`,
													service: 'iam',
												},
											),
										],
										conditions: {
											StringEquals: {
												'iam:ResourceTag/aws-cdk:bootstrap-role': roleName,
											},
										},
										effect: cdk.aws_iam.Effect.ALLOW,
									},
								),
							),
						},
					),
				},
				path: props.path,
			},
		);
	};
};
