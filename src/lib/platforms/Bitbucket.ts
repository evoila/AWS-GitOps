import * as self_platform from '../platform';

import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';


export interface foobar_
{
	openIdConnectAudience : string;
	type : 'Cloud' | 'Data Center';
	workspaceName : string;
};

export interface foobarCloud extends foobar_
{
	type : 'Cloud';
};

export interface foobarDataCenter extends foobar_
{
	type : 'Data Center';
	host : string;
};

export
type OpenIdConnectProviderProps = foobarCloud | foobarDataCenter;

export
interface RepositoryProps
{
	//owner: string;
	//repository: string;
	//uuid : string;
	name : string;
};

// https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
export
class OpenIdConnectProvider
extends self_platform.OpenIdConnectProvider
{
	// public static
	public static readonly cloudOpenIdConnectIssuerHostName = 'api.bitbucket.org';

	// public
	public /*override*/ readonly openIdConnectProvider : cdk.aws_iam.IOpenIdConnectProvider;
	public readonly host : string;

	// private static
	// https://support.atlassian.com/bitbucket-cloud/docs/what-are-the-bitbucket-cloud-ip-addresses-i-should-use-to-configure-my-corporate-firewall/
	static readonly #ipAddresses = [
		"34.199.54.113/32",
		"34.232.25.90/32",
		"34.232.119.183/32",
		"34.236.25.177/32",
		"35.171.175.212/32",
		"52.54.90.98/32",
		"52.202.195.162/32",
		"52.203.14.55/32",
		"52.204.96.37/32",
		"34.218.156.209/32",
		"34.218.168.212/32",
		"52.41.219.63/32",
		"35.155.178.254/32",
		"35.160.177.10/32",
		"34.216.18.129/32",
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

		//const openIdConnectIssuerHost = props.type === 'cloud' ? OpenIdConnectProviderStack.cloudHostName : props.host;
		const openIdConnectIssuerHost = (
			props.type === 'Cloud'
			?
			OpenIdConnectProvider.cloudOpenIdConnectIssuerHostName
			:
			props.host
		);
		//const openIdConnectIssuerUrl = props.type === 'cloud' ? `https://${OpenIdConnectProviderStack.cloudHostName}` : `https://${props.host}/_services/token`;
		const openIdConnectIssuerUrl = (
			props.type === 'Cloud'
			?
			`https://${OpenIdConnectProvider.cloudOpenIdConnectIssuerHostName}/2.0/workspaces/${props.workspaceName}/pipelines-config/identity/oidc`
			:
			`https://${props.host}/FIXME`
		);
		this.#awsIamConditionKey = (
			props.type === 'Cloud'
			?
			`${OpenIdConnectProvider.cloudOpenIdConnectIssuerHostName}/2.0/workspaces/${props.workspaceName}/pipelines-config/identity/oidc`
			:
			`${props.host}/FIXME`
		);

		const thumbprints = this.getOpenIdConnectIssuerTlsCertificateThumbprints(
			openIdConnectIssuerHost,
		);

		this.#cfnOIDCProvider = new cdk.aws_iam.CfnOIDCProvider(
			this,
			'OpenIDConnectProvider',
			// https://support.atlassian.com/bitbucket-cloud/docs/deploy-on-aws-using-bitbucket-pipelines-openid-connect/
			// https://aws.amazon.com/blogs/apn/using-bitbucket-pipelines-and-openid-connect-to-deploy-to-amazon-s3/
			{
				clientIdList: [
					`ari:cloud:bitbucket::workspace/${props.openIdConnectAudience}`,
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
	};

	/**
	 * Generate a trust policy that allows all but the specified branches of the specified repository at GitHub to assume a role.
	 * @param repository 
	 * @param branches 
	 * @returns 
	 */
	//override
	generateTrustPolicyForAllBranchesExcept
	(
		repository : RepositoryProps,
		branches : string[],
	)
	: cdk.aws_iam.IAssumeRolePrincipal
	{
		const repositoryUuid = this.#getRepositoryUuid(
			repository.name,
		);
		const principal = new cdk.aws_iam.OpenIdConnectPrincipal(
			this.openIdConnectProvider,
			{
				IpAddress: {
					'aws:SourceIp': OpenIdConnectProvider.#ipAddresses,
				},
				StringEquals: {
					[`${this.#awsIamConditionKey}:repositoryUuid`]: [
						repositoryUuid,
					],
				},
				StringLike: {
					[`${this.#awsIamConditionKey}:sub`]: [
						`{${repositoryUuid}}*`,
					],
				},
				StringNotEquals: {
					[`${this.#awsIamConditionKey}:branchName`]: branches,
				},
			},
		);
		return principal;
	}

	/**
	 * Generate a trust policy that allows the specified branches of the specified repository at GitHub to assume a role.
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
		const repositoryUuid = this.#getRepositoryUuid(
			repository.name,
		);
		const principal = new cdk.aws_iam.OpenIdConnectPrincipal(
			this.openIdConnectProvider,
			{
				IpAddress: {
					'aws:SourceIp': OpenIdConnectProvider.#ipAddresses,
				},
				StringEquals: {
					[`${this.#awsIamConditionKey}:branchName`]: branches,
					[`${this.#awsIamConditionKey}:repositoryUuid`]: [
						repositoryUuid,
					],
				},
				StringLike: {
					[`${this.#awsIamConditionKey}:sub`]: [
						`{${repositoryUuid}}*`,
					],
				},
			},
		);
		return principal;
	}

	#getRepositoryUuid
	(
		repositoryName : string,
	)
	: string
	{
		// FIXME: get from context
		// https://api.bitbucket.org/2.0/repositories/${WORKSPACE_NAME}/${REPOSITORY_NAME}
		const repositoryUuid = '2ab3df18-212a-4e41-a01b-419ee9cf19af';
		return repositoryUuid;
	}

	#getWorkspaceUuid
	(
		workspaceName : string,
	)
	: string
	{
		// FIXME: get from context
		// https://api.bitbucket.org/2.0/workspaces/${WORKSPACE_NAME}
		const workspaceUuid = '0b342a8c-fb2e-411b-8034-d6011601698c';
		return workspaceUuid;
	}
};
