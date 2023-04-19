import * as cdk from 'aws-cdk-lib';
import * as constructs from 'constructs';

import * as self_platforms from './platform';


export
class WorkloadRoles
extends constructs.Construct
{
	public readonly roles : { [ environment : string ] : self_platforms.AWSCDKAccessRole } = {
	};

	constructor
	(
		scope: constructs.Construct,
		id: string,
		roles: {
			[ identifier : string ] : {
				principal : cdk.aws_iam.IPrincipal;
				principalDescription : string;
				targetAccount : string;
			};
		},
		AwsCdkBootstrapQualifier : string,
		path : string = '/GitOps/',
	)
	{
		super(
			scope,
			id,
		);

		for
		(
			const identifier in roles
		)
		{
			const roleParameters = roles[identifier];
			const role = new self_platforms.AWSCDKAccessRole(
				this,
				identifier,
				{
					AwsCdkBootstrapQualifier: AwsCdkBootstrapQualifier,
					path: path,
					principal: roleParameters.principal,
					principalDescription: roleParameters.principalDescription,
					targetAccount: roleParameters.targetAccount,
				},
			);
			this.roles[identifier] = role;
		};
	};
};

class Accounts
extends constructs.Construct
{
	public readonly accounts : { [ name : string ] : cdk.aws_organizations.CfnAccount } = {
	};

	constructor
	(
		scope: constructs.Construct,
		id: string,
		accounts: {
			[ name : string ] : {
				emailAddress : string;
				tags ?: {
					[ key : string ] : string;
				};
			};
		},
		parentOrganizationalUnitIds: string[],
	)
	{
		super(
			scope,
			id,
		);

		for
		(
			const accountName in accounts
		)
		{
			const accountProps = accounts[accountName];
			const newAccount = new cdk.aws_organizations.CfnAccount(
				this,
				accountName,
				{
					accountName: accountName,
					email: accountProps.emailAddress,
					parentIds: parentOrganizationalUnitIds,
					tags: (
						accountProps.tags
						?
						Object.entries(
							accountProps.tags,
						)
						.map(
							(
								pair,
							) =>
							(
								{
									key: pair[0],
									value: pair[1],
								}
							),
						)
						:
						undefined
					),
				},
			);

			// > If you include multiple accounts in a single template, you must use the `DependsOn` attribute on each account resource type so that the accounts are created sequentially.
			// > If you create multiple accounts at the same time, Organizations returns an error and the stack operation fails.
			Object.values(
				this.accounts,
			)
			.forEach(
				(
					account,
				) =>
				{
					newAccount.addDependency(
						account,
					);
				},
			);

			this.accounts[accountName] = newAccount;
		};
	};
};

/*
export
interface EmailAddressConstructorProps
{
	accountName : string;
	environment : string;
	workload : string;
};
*/

export
type AccountEmailAddressConstructor = (
	workloadName : string,
	environment : string,
	/*
	args : EmailAddressConstructorProps,
	*/
	/*
	accountName : string,
	*/
)
=> string;

export
interface WorkloadAccountsProps
{
	emailAddressConstructor : AccountEmailAddressConstructor;
	environments : string[];
	parentOrganizationalUnitId : string;
	workloadName : string;
};

export
class WorkloadAccounts
extends constructs.Construct
{
	public readonly accounts : { [ environment : string ] : cdk.aws_organizations.CfnAccount } = {
	};
	public readonly organizationalUnit : cdk.aws_organizations.CfnOrganizationalUnit;

	constructor
	(
		scope: constructs.Construct,
		id: string,
		props: WorkloadAccountsProps,
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
				name: props.workloadName,
				parentId: props.parentOrganizationalUnitId,
			},
		);

		const accounts = new Accounts(
			this,
			'accounts',
			Object.fromEntries(
				props.environments.map(
					(
						environment,
					) =>
					[
						`${props.workloadName}-${environment}`,
						{
							emailAddress: props.emailAddressConstructor(
								props.workloadName,
								environment,
							),
							tags: {
								environment: environment,
								workload: props.workloadName,
							},
						},
					],
				),
			),
			[
				this.organizationalUnit.attrId,
			],
		);
		this.accounts = Object.fromEntries(
			props.environments.map(
				(
					environment,
				) =>
				[
					environment,
					accounts.accounts[`${props.workloadName}-${environment}`],
				],
			),
		);
	};
};
