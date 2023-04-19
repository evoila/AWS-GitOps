#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';

import * as stacks from './stacks';


function emailAddressConstructor
(
	workload : string,
	environment : string,
)
{
	//const emailAddress = `aws+Workloads-GitOps-${workload}-${environment}@evoila.de`;
	const emailAddress = `accounts-aws+${workload}-${environment}@evoila.de`;
	return emailAddress;
};


const app = new cdk.App(
	{
		autoSynth: false,
	},
);

/*
// AWS account (region doesn't matter, because roles are global) where OpenID Connect providers for GitHub, GitLab & co. and IAM roles for GitHub, GitLab & co. are set up
*/

// ID of the management (root) account of the organization `o-wccegzc64p`, `evoila-aws-admin`
const organizationManagementAccountId = '476496847634';

// created and managed by Control Tower
const workloadsOrganizationalUnitId = 'ou-uks1-1a71y6of'

const organizationManagementEnvironment : cdk.Environment = {
	// > This operation [the API method `CreateAccount`] can be called only from the organization's management account.
	account: organizationManagementAccountId,
	// FIXME: begründen warum in `eu-central-1`
	region: 'eu-central-1',
};

const organizationBootstrapStack = new stacks.OrganizationBootstrapStack(
	app,
	'GitOps-workloads',
	{
		description: 'Common resources for GitOps workloads',
		env: organizationManagementEnvironment,
		lookupAccountIds: [
			'647757387083',
		],
		organizationManagementAccountId: organizationManagementAccountId,
		regions: [
			'eu-central-1',
		],
		workloadsOrganizationalUnitId: workloadsOrganizationalUnitId,
	},
);

const openIdConnectProviderGitHubCloudStack = new stacks.GitHubOpenIdConnectProviderStack(
	app,
	'IAM-IdP-GitHub-Cloud',
	//'OpenIDConnect-IdP-GitHub-Cloud',
	{
		description: 'OpenID Connect identity provider for GitHub Cloud',
		env: organizationManagementEnvironment,
	},
);

new stacks.GitHubProdTestWorkloadStack(
	app,
	'GitOps-workload-Optalio',
	{
		AwsCdkBootstrapQualifier: organizationBootstrapStack.cdkBootstrapQualifier,
		description: 'Infrastructure for the Optalio system',
		emailAddressConstructor: emailAddressConstructor,
		env: organizationManagementEnvironment,
		name: 'Optalio',
		openIdConnectProvider: openIdConnectProviderGitHubCloudStack.openIdConnectProvider,
		parentOrganizationalUnitId: organizationBootstrapStack.organizationalUnitId,
		repository: {
			owner: 'evoila',
			name: 'aws-optalio_iac',
		},
	},
);

app.synth(
);
