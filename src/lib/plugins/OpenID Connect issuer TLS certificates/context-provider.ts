import * as node_tls from 'node:tls';
import * as node_url from 'node:url';

import * as awsCdkLibApiPlugin from 'aws-cdk/lib/api/plugin';
import * as awsCdkLibCloudAssemblySchema from "aws-cdk-lib/cloud-assembly-schema";
import * as openidClient from 'openid-client';


function getOpenIdConnectIssuerUrl
(
	host : string,
	port ? : number,
)
: Promise<node_url.URL>
{
	const issuerURL = (
		port
		?
		`https://${host}:${port}`
		:
		`https://${host}`
	);
	/*
	const issuerURL = new node_url.URL(
	);
	*/
	const promise = new Promise<node_url.URL>(
		function(
			resolve,
			reject,
		)
		{
			openidClient.Issuer.discover(
				issuerURL,
			)
			.then(
				function(
					issuer,
				)
				{
					const url = new node_url.URL(
						issuer.metadata.jwks_uri!,
					);
					console.log(
						'jwks_uri: %s',
						url,
					);
					resolve(
						url,
					);
				},
			);
		},
	);
	return promise;
};

function getTlsCertificates
(
	host : string,
	port : number,
)
: Promise<Buffer[]>
{
	const promise = new Promise<Buffer[]>(
		function(
			resolve,
			reject,
		)
		{
			const socket = node_tls.connect(
				{
					host : host,
					port : port,
					// for SNI (server name identification)
					// If the remote server is using SNI (that is, sharing multiple SSL hosts on a single IP address) you will need to send the correct hostname in order to get the right certificate.
					servername : host,
				},
				function(
				)
				{
					const leafCertificate = socket.getPeerCertificate(
						true,
					);
					socket.destroy(
					);
					let certificate = leafCertificate;
					let nextCertificate = certificate;
					let index = 0;
					do
					{
						certificate = nextCertificate;
	
						console.log(
							'%s: %i: fingerprint reported SHA-1: %s %s',
							host,
							index,
							certificate.subject.CN,
							certificate.fingerprint,
						);
						const certificateData = certificate.raw;
						console.log(
							'%s: %i: fingerprint SHA-256: %s %s',
							host,
							index,
							certificate.subject.CN,
							certificate.fingerprint256,
						);
						console.log(
							'%s: %i: fingerprint SHA-512: %s %s',
							host,
							index,
							certificate.subject.CN,
							certificate.fingerprint512,
						);
						console.log(
							'%s: %i: valid until: %s',
							host,
							index,
							certificate.valid_to,
						);
	
						nextCertificate = certificate.issuerCertificate;
						++index;
					}
					while
					(
						nextCertificate
						&&
						nextCertificate !== certificate
					);
	
					// FIXME: first CA instead of leaf?
					const relevantCertificate = leafCertificate;
	
					const relevantCertificates = [
						relevantCertificate.raw,
					];
	
					resolve(
						relevantCertificates,
					);
				},
			);
		},
	);
	return promise;
};

export
interface ContextQuery
extends awsCdkLibCloudAssemblySchema.PluginContextQuery
{
	readonly host : string;
	readonly port ? : number;
};

export
type ContextValue = string[];

export
class ContextProvider
implements awsCdkLibApiPlugin.ContextProviderPlugin
{
	public /*async*/ getValue
	(
		args : ContextQuery,
	)
	: Promise<ContextValue>
	{
		const promise = new Promise<ContextValue>(
			function
			(
				resolve,
				reject,
			)
			{
				getOpenIdConnectIssuerUrl(
					args.host,
					args.port ?? 443,
				)
				.then(
					function
					(
						url,
					)
					{
						getTlsCertificates(
							url.host,
							url.port ? parseInt(url.port) : 443,
						)
						.then(
							function
							(
								tlsCertificates,
							)
							{
								/*
								const tlsCertificateThumbprints = relevantCertificates.map(
									(
										tlsCertificate : Buffer,
									) =>
									{
										const hash = node_crypto.createHash(
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
								*/
								resolve(
									tlsCertificates.map(
										(
											tlsCertificate,
										) =>
										tlsCertificate.toString(
											'base64',
										)
										,
									),
								);
							},
						)
						;
					},
				)
				;
			},
		);
		return promise;
	};
};
