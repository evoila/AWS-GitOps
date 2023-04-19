import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';

import * as self_workloads from '../workload';
import * as self_platform_Bitbucket from '../platforms/Bitbucket';
import * as self_platform_GitHub from '../platforms/GitHub';
import * as self_platform_GitLab from '../platforms/GitLab';


export
interface ProdTestWorkloadConstruct
{
	readonly organizationalUnit : cdk.aws_organizations.CfnOrganizationalUnit;
	readonly prodAccount : cdk.aws_organizations.CfnAccount;
	readonly prodAccountId : string;
	//readonly prodRole : cdk.aws_iam.IRole;
	readonly prodRole : cdk.aws_iam.CfnRole;
	readonly prodRoleArn : string;
	readonly prodRoleName : string;
	readonly testAccount : cdk.aws_organizations.CfnAccount;
	readonly testAccountId : string;
	//readonly testRole : cdk.aws_iam.IRole;
	readonly testRole : cdk.aws_iam.CfnRole;
	readonly testRoleArn : string;
	readonly testRoleName : string;
};

export
interface ProdTestWorkloadProps
{
	AwsCdkBootstrapQualifier: string;
	emailAddressConstructor : self_workloads.AccountEmailAddressConstructor;
	name : string;
	parentOrganizationalUnitId : string;
	path ?: string;
};

export
class ProdTestWorkload
extends constructs.Construct
implements ProdTestWorkloadConstruct
{
	public readonly organizationalUnit : cdk.aws_organizations.CfnOrganizationalUnit;
	public readonly prodAccount : cdk.aws_organizations.CfnAccount;
	public readonly prodAccountId : string;
	//public readonly prodRole : cdk.aws_iam.IRole;
	public readonly prodRole : cdk.aws_iam.CfnRole;
	public readonly prodRoleArn : string;
	public readonly prodRoleName : string;
	public readonly testAccount : cdk.aws_organizations.CfnAccount;
	public readonly testAccountId : string;
	//public readonly testRole : cdk.aws_iam.IRole;
	public readonly testRole : cdk.aws_iam.CfnRole;
	public readonly testRoleArn : string;
	public readonly testRoleName : string;

	constructor(
		scope: constructs.Construct,
		id: string,
		{
			AwsCdkBootstrapQualifier,
			emailAddressConstructor,
			name,
			parentOrganizationalUnitId,
			path = '/GitOps/',
		} : ProdTestWorkloadProps,
		prodRolePrincipal : cdk.aws_iam.IPrincipal,
		prodRolePrincipalDescription : string,
		testRolePrincipal : cdk.aws_iam.IPrincipal,
		testRolePrincipalDescription : string,
	)
	{
		super(
			scope,
			id,
		);

		const workloadAccounts = new self_workloads.WorkloadAccounts(
			this,
			'organization',
			{
				emailAddressConstructor: emailAddressConstructor,
				environments: [
					'prod',
					'test',
				],
				parentOrganizationalUnitId: parentOrganizationalUnitId,
				workloadName: name,
			},
		);

		this.organizationalUnit = workloadAccounts.organizationalUnit;
		this.prodAccount = workloadAccounts.accounts.prod;
		this.prodAccountId = workloadAccounts.accounts.prod.attrAccountId;
		this.testAccount = workloadAccounts.accounts.test;
		this.testAccountId = workloadAccounts.accounts.test.attrAccountId;

		const roles = new self_workloads.WorkloadRoles(
			this,
			'roles',
			{
				prod: {
					principal: prodRolePrincipal,
					principalDescription: prodRolePrincipalDescription,
					targetAccount: this.prodAccountId,
				},
				test: {
					principal: testRolePrincipal,
					principalDescription: testRolePrincipalDescription,
					targetAccount: this.testAccountId,
				},
			},
			AwsCdkBootstrapQualifier,
			path,
		);

		const prodRole = roles.roles.prod.role;
		//this.prodRole = roles.roles.prod.role;
		this.prodRole = prodRole.node.defaultChild as cdk.aws_iam.CfnRole;
		this.prodRoleArn = prodRole.roleArn;
		this.prodRoleName = prodRole.roleName;
		const testRole = roles.roles.test.role;
		//this.testRole = roles.roles.test.role;
		this.testRole = testRole.node.defaultChild as cdk.aws_iam.CfnRole;
		this.testRoleArn = testRole.roleArn;
		this.testRoleName = testRole.roleName;
	};
};

export
interface BitbucketProdTestWorkloadProps
extends ProdTestWorkloadProps
{
	openIdConnectProvider : self_platform_Bitbucket.OpenIdConnectProvider;
	repository : self_platform_Bitbucket.RepositoryProps;
};

export
class BitbucketProdTestWorkload
extends constructs.Construct
//extends ProdTestWorkload
implements ProdTestWorkloadConstruct
{
	public readonly organizationalUnit : cdk.aws_organizations.CfnOrganizationalUnit;
	public readonly prodAccount : cdk.aws_organizations.CfnAccount;
	public readonly prodAccountId : string;
	public readonly prodPrincipalDescription : string;
	public readonly prodRole : cdk.aws_iam.CfnRole;
	public readonly prodRoleArn : string;
	public readonly prodRoleName : string;
	public readonly testAccount : cdk.aws_organizations.CfnAccount;
	public readonly testAccountId : string;
	public readonly testPrincipalDescription : string;
	public readonly testRole : cdk.aws_iam.CfnRole;
	public readonly testRoleArn : string;
	public readonly testRoleName : string;

	constructor(
		scope: constructs.Construct,
		id: string,
		{
			openIdConnectProvider,
			path = `/GitOps/Bitbucket/${openIdConnectProvider.host}/`,
			repository,
			...props
		} : BitbucketProdTestWorkloadProps,
	)
	{
		super(
			scope,
			id,
		);

		// FIXME
		const mainBranch = 'main';

		this.prodPrincipalDescription = `the branch \`${mainBranch}\` of the Bitbucket repository \`${repository.name}\` at \`${openIdConnectProvider.host}\``;
		this.testPrincipalDescription = `branches other than \`${mainBranch}\` of the Bitbucket repository \`${repository.name}\` at \`${openIdConnectProvider.host}\``;

		const construct = new ProdTestWorkload(
			this,
			'Default',
			props,
			openIdConnectProvider.generateTrustPolicyForSomeBranches(
				repository,
				[
					mainBranch,
				],
			),
			this.prodPrincipalDescription,
			openIdConnectProvider.generateTrustPolicyForAllBranchesExcept(
				repository,
				[
					mainBranch,
				],
			),
			this.testPrincipalDescription,
		);
		this.organizationalUnit = construct.organizationalUnit;
		this.prodAccount = construct.prodAccount;
		this.prodAccountId = construct.prodAccountId;
		this.prodRole = construct.prodRole;
		this.prodRoleArn = construct.prodRoleArn;
		this.prodRoleName = construct.prodRoleName;
		this.testAccount = construct.testAccount;
		this.testAccountId = construct.testAccountId;
		this.testRole = construct.testRole;
		this.testRoleArn = construct.testRoleArn;
		this.testRoleName = construct.testRoleName;
	};
};

export
interface GitHubProdTestWorkloadProps
extends ProdTestWorkloadProps
{
	openIdConnectProvider : self_platform_GitHub.OpenIdConnectProvider;
	repository : self_platform_GitHub.RepositoryProps;
	reusableWorkflowsProd ?: self_platform_GitHub.ReusableWorkflowsBlahblahblah;
	reusableWorkflowsTest ?: self_platform_GitHub.ReusableWorkflowsBlahblahblah;
};

export
class GitHubProdTestWorkload
extends constructs.Construct
//extends ProdTestWorkload
implements ProdTestWorkloadConstruct
{
	public readonly organizationalUnit : cdk.aws_organizations.CfnOrganizationalUnit;
	public readonly prodAccount : cdk.aws_organizations.CfnAccount;
	public readonly prodAccountId : string;
	public readonly prodPrincipalDescription : string;
	//public readonly prodRole : cdk.aws_iam.IRole;
	public readonly prodRole : cdk.aws_iam.CfnRole;
	public readonly prodRoleArn : string;
	public readonly prodRoleName : string;
	public readonly testAccount : cdk.aws_organizations.CfnAccount;
	public readonly testAccountId : string;
	public readonly testPrincipalDescription : string;
	//public readonly testRole : cdk.aws_iam.IRole;
	public readonly testRole : cdk.aws_iam.CfnRole;
	public readonly testRoleArn : string;
	public readonly testRoleName : string;

	constructor(
		scope: constructs.Construct,
		id: string,
		{
			openIdConnectProvider,
			path = `/GitOps/GitHub/${openIdConnectProvider.host}/`,
			repository,
			...props
		} : GitHubProdTestWorkloadProps,
	)
	{
		super(
			scope,
			id,
		);

		const mainBranch = this.#getDefaultBranchForRepository(
			openIdConnectProvider,
			repository,
		);

		/*
		externalIds: [
			// `github.repositoryUrl`
			// https://docs.github.com/en/actions/learn-github-actions/contexts#github-context
			`git://${props.openIdConnectProviderStack.host}/${props.parameters.owner}/${props.parameters.repository}.git`,
		],
		*/

		this.prodPrincipalDescription = `the branch \`${mainBranch}\` of the GitHub repository \`${repository.owner}/${repository.name}\` at \`${openIdConnectProvider.host}\``;
		this.testPrincipalDescription = `pull requests and branches other than \`${mainBranch}\` of the GitHub repository \`${repository.owner}/${repository.name}\` at \`${openIdConnectProvider.host}\``;

		const construct = new ProdTestWorkload(
			this,
			'Default',
			props,
			openIdConnectProvider.generateTrustPolicyForSomeBranches(
				repository,
				[
					mainBranch,
				],
				props.reusableWorkflowsProd,
			),
			this.prodPrincipalDescription,
			new cdk.aws_iam.CompositePrincipal(
				openIdConnectProvider.generateTrustPolicyForAllBranchesExcept(
					repository,
					[
						mainBranch,
					],
					props.reusableWorkflowsTest,
				),
				openIdConnectProvider.generateTrustPolicyForPullRequests(
					repository,
					props.reusableWorkflowsTest,
				),
			),
			this.testPrincipalDescription,
		);
		this.organizationalUnit = construct.organizationalUnit;
		this.prodAccount = construct.prodAccount;
		this.prodAccountId = construct.prodAccountId;
		this.prodRole = construct.prodRole;
		this.prodRoleArn = construct.prodRoleArn;
		this.prodRoleName = construct.prodRoleName;
		this.testAccount = construct.testAccount;
		this.testAccountId = construct.testAccountId;
		this.testRole = construct.testRole;
		this.testRoleArn = construct.testRoleArn;
		this.testRoleName = construct.testRoleName;
	};

	#getDefaultBranchForRepository
	(
		openIdConnectProvider : self_platform_GitHub.OpenIdConnectProvider,
		repository : self_platform_GitHub.RepositoryProps,
	)
	: string
	{
		const mainBranchContextQuery = cdk.ContextProvider.getValue(
			this,
			{
				dummyValue: '',
				includeEnvironment: false,
				props: {
					host: openIdConnectProvider.host,
					pluginName: 'GitHub default branch',
					repository: repository,
				},
				provider: 'plugin',
			},
		);
		return mainBranchContextQuery.value!;
	};
};

export
interface GitLabProdTestWorkloadProps
extends ProdTestWorkloadProps
{
	openIdConnectProvider : self_platform_GitLab.OpenIdConnectProvider;
	repository : self_platform_GitLab.RepositoryProps;
};

export
class GitLabProdTestWorkload
extends constructs.Construct
//extends ProdTestWorkload
implements ProdTestWorkloadConstruct
{
	public readonly organizationalUnit : cdk.aws_organizations.CfnOrganizationalUnit;
	public readonly prodAccount : cdk.aws_organizations.CfnAccount;
	public readonly prodAccountId : string;
	public readonly prodPrincipalDescription : string;
	public readonly prodRole : cdk.aws_iam.CfnRole;
	public readonly prodRoleArn : string;
	public readonly prodRoleName : string;
	public readonly testAccount : cdk.aws_organizations.CfnAccount;
	public readonly testAccountId : string;
	public readonly testPrincipalDescription : string;
	public readonly testRole : cdk.aws_iam.CfnRole;
	public readonly testRoleArn : string;
	public readonly testRoleName : string;

	constructor(
		scope: constructs.Construct,
		id: string,
		{
			openIdConnectProvider,
			path = `/GitOps/GitLab/${openIdConnectProvider.host}/`,
			repository,
			...props
		} : GitLabProdTestWorkloadProps,
	)
	{
		super(
			scope,
			id,
		);

		const mainBranch = this.#getMainBranchForRepository(
			openIdConnectProvider,
			repository,
		);

		this.prodPrincipalDescription = `the branch \`${mainBranch}\` of the GitLab repository \`${repository.group}/${repository.project}\` at \`${openIdConnectProvider.host}\``;
		this.testPrincipalDescription = `branches other than \`${mainBranch}\` of the GitLab repository \`${repository.group}/${repository.project}\` at \`${openIdConnectProvider.host}\``;

		const construct = new ProdTestWorkload(
			this,
			'Default',
			props,
			openIdConnectProvider.generateTrustPolicyForSomeBranches(
				repository,
				[
					mainBranch,
				],
			),
			this.prodPrincipalDescription,
			openIdConnectProvider.generateTrustPolicyForAllBranchesExcept(
				repository,
				[
					mainBranch,
				],
			),
			this.testPrincipalDescription,
		);
		this.organizationalUnit = construct.organizationalUnit;
		this.prodAccount = construct.prodAccount;
		this.prodAccountId = construct.prodAccountId;
		this.prodRole = construct.prodRole;
		this.prodRoleArn = construct.prodRoleArn;
		this.prodRoleName = construct.prodRoleName;
		this.testAccount = construct.testAccount;
		this.testAccountId = construct.testAccountId;
		this.testRole = construct.testRole;
		this.testRoleArn = construct.testRoleArn;
		this.testRoleName = construct.testRoleName;
	};

	#getMainBranchForRepository
	(
		openIdConnectProvider : self_platform_GitLab.OpenIdConnectProvider,
		repository : self_platform_GitLab.RepositoryProps,
	)
	: string
	{
		// FIXME
		return 'main';
	};
};
