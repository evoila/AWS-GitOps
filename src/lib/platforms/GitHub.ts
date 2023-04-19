import * as self_platform from '../platform';

import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';


export
interface foobar_
{
	type : 'cloud' | 'enterprise';
};

export
interface foobarCloud extends foobar_
{
	type : 'cloud';
};

export
interface foobarEnterprise extends foobar_
{
	type : 'enterprise';
	host : string;
};

export
type OpenIdConnectProviderProps =
	foobarCloud
	|
	foobarEnterprise
	;

export
interface RepositoryProps
{
	owner: string;
	name: string;
};

export
interface ReusableWorkflowsBlahblahblah
{
	branches ?: string[];
	//paths ?: string[];
	repository : RepositoryProps;
	tags ?: string[];
}

// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
export
class OpenIdConnectProvider
extends self_platform.OpenIdConnectProvider
{
	// public static
	public static readonly cloudHostName = 'github.com';
	public static readonly cloudOpenIdConnectIssuerHostName = 'token.actions.githubusercontent.com';

	// public
	public /*override*/ readonly openIdConnectProvider : cdk.aws_iam.IOpenIdConnectProvider;
	public readonly host : string;

	// private static
	static readonly #audiences = [
		'sts.amazonaws.com',
	];

	// private
	readonly #awsIamConditionKey : string;
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

		//const openIdConnectIssuerHost = props.type === 'cloud' ? OpenIdConnectProviderStack.cloudHostName : props.host;
		const openIdConnectIssuerHost = (
			props.type === 'cloud'
			?
			OpenIdConnectProvider.cloudOpenIdConnectIssuerHostName
			:
			props.host
		);
		//const openIdConnectIssuerUrl = props.type === 'cloud' ? `https://${OpenIdConnectProviderStack.cloudHostName}` : `https://${props.host}/_services/token`;
		const openIdConnectIssuerUrl = (
			props.type === 'cloud'
			?
			`https://${openIdConnectIssuerHost}`
			:
			`https://${openIdConnectIssuerHost}/_services/token`
		);
		this.#awsIamConditionKey = (
			props.type === 'cloud'
			?
			OpenIdConnectProvider.cloudOpenIdConnectIssuerHostName
			:
			`${props.host}/_services/token`
		);

		const thumbprints = this.getOpenIdConnectIssuerTlsCertificateThumbprints(
			openIdConnectIssuerHost,
		);

		// because it's a custom resource
		/*
		this.#openIdConnectProvider = new cdk.aws_iam.OpenIdConnectProvider(
			this,
			'OpenIDConnectProvider',
			// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#adding-the-identity-provider-to-aws
			{
				clientIds: OpenIdConnectProviderStack.audiences,
				thumbprints: thumbprints,
				url: openIdConnectIssuerUrl,
			}
		);
		this.openIdConnectProvider = this.#openIdConnectProvider;
		*/

		this.#cfnOIDCProvider = new cdk.aws_iam.CfnOIDCProvider(
			this,
			//'OpenID Connect provider',
			'Default',
			// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#adding-the-identity-provider-to-aws
			// https://docs.github.com/en/enterprise-server@3.8/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
			{
				clientIdList: OpenIdConnectProvider.#audiences,
				thumbprintList: thumbprints,
				url: openIdConnectIssuerUrl,
			}
		);
		this.openIdConnectProvider = cdk.aws_iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
			this,
			'dfdf',
			this.#cfnOIDCProvider.attrArn,
		);
	};

	#generatePrincipalConditionsForRepository
	(
		repository : RepositoryProps,
	)
	: cdk.aws_iam.Conditions
	{
		const conditions = {
			StringEquals: {
				[`${this.#awsIamConditionKey}:repository`]: [
					`${repository.owner}/${repository.name}`,
				],
				[`${this.#awsIamConditionKey}:repository_owner`]: [
					repository.owner,
				],
			},
		};
		return conditions;
	};

	// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/using-openid-connect-with-reusable-workflows
	#generatePrincipalConditionsForReusableWorkflow
	(
		{
			repository,
			branches = [
			],
			tags = [
			],
		} : ReusableWorkflowsBlahblahblah,
	)
	: cdk.aws_iam.Conditions
	{
		const conditions = {
			StringLike: {
				[`${this.#awsIamConditionKey}:job_workflow_ref`]: [
					//`evoila/GitHub-Actions/.github/workflows/reusable-AWS-CDK-*-app.yaml@refs/tags/v*`,
					//`evoila/GitHub-Actions/.github/workflows/reusable-AWS-CDK-Python-app.yaml@refs/tags/v*`,
					//`evoila/GitHub-Actions/.github/workflows/reusable-AWS-CDK-TypeScript-app.yaml@refs/tags/v*`,
					...branches.map(
						(
							branch,
						) =>
						`${repository.owner}/${repository.name}/*@refs/heads/${branch}`,
					),
					...tags.map(
						(
							tag,
						) =>
						`${repository.owner}/${repository.name}/*@refs/tags/${tag}`,
					),
				],
			},
		};
		return conditions;
	};

	/**
	 * Generate a trust policy that allows all but the specified branches of the specified repository at GitHub to assume a role.
	 * @param repository 
	 * @param branches 
	 * @returns 
	 */
	public generateTrustPolicyForAllBranchesExcept
	(
		repository : RepositoryProps,
		branches : string[],
		reusableWorkflows ?: ReusableWorkflowsBlahblahblah,
	)
	: cdk.aws_iam.IAssumeRolePrincipal
	{
		// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud
		// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#configuring-the-role-and-trust-policy
		const principal = new cdk.aws_iam.PrincipalWithConditions(
			new cdk.aws_iam.OpenIdConnectPrincipal(
				this.openIdConnectProvider,
			),
			{
				StringEquals: {
					[`${this.#awsIamConditionKey}:aud`]: OpenIdConnectProvider.#audiences,
					[`${this.#awsIamConditionKey}:ref_type`]: [
						'branch',
					],
					/*
					[`${this.#awsIamConditionKey}:runner_environment`]: [
						'github-hosted',
						// 'self-hosted',
					],
					*/
				},
				StringLike: {
					// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud
					[`${this.#awsIamConditionKey}:sub`]: [
						`repo:${repository.owner}/${repository.name}:ref:refs/heads/*`,
					],
				},
				StringNotEquals: {
					// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud
					[`${this.#awsIamConditionKey}:sub`]: branches.map(
						(
							branch : string,
						) =>
						`repo:${repository.owner}/${repository.name}:ref:refs/heads/${branch}`,
					),
					// base_ref
					// head_ref
					[`${this.#awsIamConditionKey}:ref`]: branches,
				},
			},
		);
		principal.addConditions(
			this.#generatePrincipalConditionsForRepository(
				repository,
			),
		);
		if
		(
			reusableWorkflows
		)
		{
			principal.addConditions(
				this.#generatePrincipalConditionsForReusableWorkflow(
					reusableWorkflows,
				),
			);
		}
		return principal;
	};

	public generateTrustPolicyForPullRequests
	(
		repository : RepositoryProps,
		reusableWorkflows ?: ReusableWorkflowsBlahblahblah,
	)
	: cdk.aws_iam.IAssumeRolePrincipal
	{
		// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud
		// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#configuring-the-role-and-trust-policy
		const principal = new cdk.aws_iam.PrincipalWithConditions(
			new cdk.aws_iam.OpenIdConnectPrincipal(
				this.openIdConnectProvider,
			),
			{
				StringEquals: {
					[`${this.#awsIamConditionKey}:aud`]: OpenIdConnectProvider.#audiences,
					[`${this.#awsIamConditionKey}:runner_environment`]: [
						'github-hosted',
						// 'self-hosted',
					],
					// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud
					[`${this.#awsIamConditionKey}:sub`]: `repo:${repository.owner}/${repository.name}:pull_request`,
				},
			},
		);
		principal.addConditions(
			this.#generatePrincipalConditionsForRepository(
				repository,
			),
		);
		if
		(
			reusableWorkflows
		)
		{
			principal.addConditions(
				this.#generatePrincipalConditionsForReusableWorkflow(
					reusableWorkflows,
				),
			);
		}
		return principal;
	};

	/**
	 * Generate a trust policy that allows the specified branches of the specified repository at GitHub to assume a role.
	 * @param repository 
	 * @param branches 
	 * @returns 
	 */
	//override
	public generateTrustPolicyForSomeBranches
	(
		repository: RepositoryProps,
		branches: string[],
		reusableWorkflows ?: ReusableWorkflowsBlahblahblah,
	)
	: cdk.aws_iam.IAssumeRolePrincipal
	{
		// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud
		// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services#configuring-the-role-and-trust-policy
		const principal = new cdk.aws_iam.PrincipalWithConditions(
			new cdk.aws_iam.OpenIdConnectPrincipal(
				this.openIdConnectProvider,
			),
			{
				StringEquals: {
					[`${this.#awsIamConditionKey}:aud`]: OpenIdConnectProvider.#audiences,
					// base_ref
					// head_ref
					[`${this.#awsIamConditionKey}:ref`]: branches,
					[`${this.#awsIamConditionKey}:ref_type`]: [
						'branch',
					],
					// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#configuring-the-oidc-trust-with-the-cloud
					[`${this.#awsIamConditionKey}:sub`]: branches.map(
						(
							branch : string,
						) =>
						`repo:${repository.owner}/${repository.name}:ref:refs/heads/${branch}`,
					),
				},
			},
		);
		principal.addConditions(
			this.#generatePrincipalConditionsForRepository(
				repository,
			),
		);
		if
		(
			reusableWorkflows
		)
		{
			principal.addConditions(
				this.#generatePrincipalConditionsForReusableWorkflow(
					reusableWorkflows,
				),
			);
		}
		return principal;
	};
};
