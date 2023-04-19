import * as self_platform from '../platform';

import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';


export interface foobar_
{
	type : 'cloud' | 'self-hosted';
};

export interface foobarCloud extends foobar_
{
	type : 'cloud';
};

export interface foobarSelfHosted extends foobar_
{
	type : 'self-hosted';
	host : string;
};

export type OpenIdConnectProviderProps = foobarCloud | foobarSelfHosted;

export
interface RepositoryProps
{
	group: string;
	project: string;
};

/*
export interface OpenIdConnectProviderStackProps extends self_platform.OpenIdConnectProviderStackProps
{
};
*/

// https://docs.gitlab.com/ee/ci/cloud_services/aws/
export
class OpenIdConnectProvider
extends self_platform.OpenIdConnectProvider
{
	// public static
	public static readonly cloudHostName = 'gitlab.com';

	// public
	public /*override*/ readonly openIdConnectProvider : cdk.aws_iam.IOpenIdConnectProvider;
	public readonly host : string;

	// private
	readonly #cfnOIDCProvider : cdk.aws_iam.CfnOIDCProvider;
	//readonly #openIdConnectProvider : cdk.aws_iam.OpenIdConnectProvider;

	constructor
	(
		scope: constructs.Construct,
		id: string,
		props: OpenIdConnectProviderProps,
	)
	{
		super(
			scope,
			id,
		);

		this.host = (
			props.type === 'cloud'
			?
			OpenIdConnectProvider.cloudHostName
			:
			props.host
		);
		const openIdConnectIssuerUrl = `https://${this.host}`;

		const thumbprints = this.getOpenIdConnectIssuerTlsCertificateThumbprints(
			this.host,
		);

		this.#cfnOIDCProvider = new cdk.aws_iam.CfnOIDCProvider(
			this,
			'OpenID Connect provider',
			{
				// https://docs.gitlab.com/ee/ci/cloud_services/aws/#add-the-identity-provider
				clientIdList: [
					openIdConnectIssuerUrl,
				],
				thumbprintList: thumbprints,
				url: openIdConnectIssuerUrl,
			}
		);
		this.openIdConnectProvider = cdk.aws_iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
			this,
			'dfdf',
			this.#cfnOIDCProvider.attrArn,
		);
	}

	#generatePrincipalConditionsForRepository
	(
		repository : RepositoryProps,
	)
	: cdk.aws_iam.Conditions
	{
		const conditions = {
			StringEquals: {
				[`${this.host}:namespace_path`]: [
					repository.group,
				],
				[`${this.host}:project_path`]: [
					`${repository.group}/${repository.project}`,
				],
			},
		};
		return conditions;
	}

	/**
	 * Generate a trust policy that allows all but the specified branches of the specified repository at GitLab to assume a role.
	 * @param repository 
	 * @param branches 
	 * @returns 
	 */
	//override
	generateTrustPolicyForAllBranchesExcept
	(
		repository: RepositoryProps,
		branches: string[],
	)
	: cdk.aws_iam.IAssumeRolePrincipal
	{
		// https://docs.gitlab.com/ee/ci/cloud_services/aws/#configure-a-role-and-trust
		const principal = new cdk.aws_iam.OpenIdConnectPrincipal(
			this.openIdConnectProvider,
			{
				StringEquals: {
					[`${this.host}:namespace_path`]: [
						repository.group,
					],
					[`${this.host}:project_path`]: [
						`${repository.group}/${repository.project}`,
					],
					[`${this.host}:ref_type`]: [
						'branch',
					],
				},
				StringLike: {
					[`${this.host}:sub`]: [
						`project_path:${repository.group}/${repository.project}:ref_type:branch:ref:*`,
					],
				},
				StringNotEquals: {
					[`${this.host}:ref`]: branches,
					[`${this.host}:sub`]: branches.map(
						(
							branch,
						) =>
						`project_path:${repository.group}/${repository.project}:ref_type:branch:ref:${branch}`,
					),
				},
			},
		);
		const repositoryConditions = this.#generatePrincipalConditionsForRepository(
			repository,
		);
		const finalPrincipal = principal.withConditions(
			repositoryConditions,
		);
		return finalPrincipal;
	}

	/**
	 * Generate a trust policy that allows the specified branches of the specified repository at GitLab to assume a role.
	 * @param repository 
	 * @param branches 
	 * @returns 
	 */
	//override
	generateTrustPolicyForSomeBranches
	(
		repository: RepositoryProps,
		branches: string[],
	)
	: cdk.aws_iam.IAssumeRolePrincipal
	{
		// https://docs.gitlab.com/ee/ci/cloud_services/aws/#configure-a-role-and-trust
		const principal = new cdk.aws_iam.OpenIdConnectPrincipal(
			this.openIdConnectProvider,
			{
				StringEquals: {
					[`${this.host}:namespace_path`]: [
						repository.group,
					],
					[`${this.host}:project_path`]: [
						`${repository.group}/${repository.project}`,
					],
					[`${this.host}:ref`]: branches,
					[`${this.host}:ref_type`]: [
						'branch',
					],
					[`${this.host}:sub`]: branches.map(
						branch => `project_path:${repository.group}/${repository.project}:ref_type:branch:ref:${branch}`,
					),
				},
			},
		);
		return principal;
	}
};
