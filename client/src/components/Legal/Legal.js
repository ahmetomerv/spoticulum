import React from 'react';

const ExternalLink = ({ href, children }) => (
  <a href={href} target='_blank' rel='noopener noreferrer'>
    {children}
  </a>
);

class Legal extends React.Component {
  componentDidMount() {
    const section = window.location.hash.slice(1);
    if (section) {
      const path = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(window.history.state, '', path);
      const scrollToSection = () => {
        const target = document.getElementById(section);
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, top);
          window.history.replaceState(window.history.state, '', `${path}#${section}`);
        }
      };
      if (document.readyState === 'complete') {
        window.requestAnimationFrame(scrollToSection);
      } else {
        window.addEventListener('load', scrollToSection, { once: true });
      }
    }
  }

  render () {
    return (
      <main className='legal-container'>
        <section id='terms-of-service'>
          <h1>Terms of Service</h1>
          <p>Last updated and effective: <time dateTime='2026-09-13'>13 September 2026</time></p>

          <p>
            These Terms of Service govern your use of <a href='https://spoticulum.xyz'>Spoticulum</a>,
            a service operated by Ahmet Ömer that creates a downloadable image from your Spotify listening data.
            By selecting “Connect with Spotify” or otherwise using Spoticulum, you agree to these Terms and acknowledge
            the Privacy Policy below.
          </p>

          <h2>The service</h2>
          <p>
            Spoticulum connects to Spotify at your request, retrieves the Spotify profile and top-listening data needed
            to assemble your collection, and generates the image in your browser. Spoticulum is offered without charge
            and may be changed, suspended, or discontinued. Availability also depends on Spotify and other internet
            services outside our control.
          </p>

          <h2>Eligibility and Spotify account</h2>
          <p>
            The service is not directed to children. You may use it only if you are at least 16 years old, meet Spotify’s
            minimum age requirements in your country, and are legally able to accept these Terms. You must use your own
            Spotify account and comply with Spotify’s applicable terms and policies. You remain responsible for the
            security of your Spotify account; Spoticulum never asks for your Spotify password.
          </p>

          <h2>Permission and disconnection</h2>
          <p>
            Spoticulum requests the <code>user-top-read</code> permission solely to show your top artists or tracks and
            related album artwork. You may stop using the service at any time and revoke Spoticulum’s access from your
            Spotify account’s <ExternalLink href='https://www.spotify.com/account/apps/'>Apps page</ExternalLink>.
          </p>

          <h2>Acceptable use</h2>
          <p>You agree that you will not:</p>
          <ul>
            <li>use Spoticulum or Spotify content for an unlawful, commercial, advertising, or data-broker purpose;</li>
            <li>scrape, bulk-download, resell, or create a database from Spotify data or content;</li>
            <li>interfere with the service, bypass access controls, or make excessive automated requests;</li>
            <li>misrepresent an association with Spoticulum or Spotify; or</li>
            <li>
              modify, reverse engineer, decompile, or create derivative works from the Spotify Platform, Spotify Service,
              or Spotify content except where applicable law expressly permits it.
            </li>
          </ul>

          <h2>Intellectual property</h2>
          <p>
            Spoticulum’s original software, text, and branding are protected by applicable intellectual-property laws.
            Spotify names, marks, metadata, profile images, artist images, and album artwork belong to Spotify or their
            respective owners. Spoticulum does not transfer ownership of that material. You may download the generated
            collection for personal, non-commercial use, subject to the rights of those owners and Spotify’s terms.
          </p>

          <h2>Spotify relationship and required disclaimers</h2>
          <p>
            Spoticulum is an independent service and is not affiliated with, authorized by, endorsed by, or sponsored by
            Spotify AB or its affiliates. Spoticulum makes no warranty or representation on Spotify’s behalf. To the
            fullest extent permitted by law, all implied warranties concerning the Spotify Platform, Spotify Service, and
            Spotify content—including merchantability, fitness for a particular purpose, and non-infringement—are
            disclaimed. Spoticulum is solely responsible for this service. Spotify is an intended third-party beneficiary
            of these Terms and may directly enforce the provisions concerning its platform, service, content, and rights.
          </p>

          <h2>Warranty and liability</h2>
          <p>
            Spoticulum is provided on an “as available” basis. We do not promise uninterrupted operation, permanent
            availability of Spotify data, or that every generated image will be error-free. Nothing in these Terms limits
            liability for intent, gross negligence, injury to life, body or health, fraudulent concealment, a guarantee,
            or liability that cannot legally be excluded. For slight negligence affecting an essential contractual duty,
            liability is limited to the foreseeable damage typical for this kind of service. Liability is otherwise
            excluded to the extent permitted by law.
          </p>

          <h2>Termination</h2>
          <p>
            You may stop using Spoticulum at any time. We may restrict access where reasonably necessary to protect the
            service, comply with law or Spotify requirements, or respond to misuse. Sections that by their nature should
            survive termination, including intellectual-property and liability provisions, will continue to apply.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these Terms to reflect service, legal, or security changes. The updated date will appear above.
            Material changes will apply prospectively, and additional notice or consent will be provided where required
            by law.
          </p>

          <h2>Governing law</h2>
          <p>
            German law applies. If you are a consumer, this choice does not deprive you of mandatory protections provided
            by the law of your habitual residence. Disputes may be brought before the courts that have jurisdiction under
            applicable law; these Terms do not require consumer arbitration.
          </p>

          <h2>Contact</h2>
          <p>
            Operator: Ahmet Ömer. Questions about these Terms may be sent to{' '}
            <a href='mailto:spoticulum@ahmeto.com'>spoticulum@ahmeto.com</a>.
          </p>
        </section>

        <section id='privacy-policy'>
          <h1>Privacy Policy</h1>
          <p>Last updated and effective: <time dateTime='2026-09-13'>13 September 2026</time></p>

          <h2>Controller and scope</h2>
          <p>
            Ahmet Ömer is the controller for personal data processed by Spoticulum. Contact:{' '}
            <a href='mailto:spoticulum@ahmeto.com'>spoticulum@ahmeto.com</a>. This policy explains processing when you visit the website,
            connect Spotify, generate a collection, or choose optional analytics.
          </p>

          <h2>Data processed to provide Spoticulum</h2>
          <ul>
            <li>
              <strong>Spotify authorization:</strong> When you choose to log in, Spotify sends Spoticulum a short-lived
              authorization code. The server exchanges it for access-token data using the confidential client credential.
            </li>
            <li>
              <strong>Spotify profile and listening data:</strong> The browser requests your display name, profile image
              and profile link, top artists or tracks, related album information, and artwork. Spoticulum requests only the
              <code>user-top-read</code> scope. Spotify receives your requests and applies its own privacy policy.
            </li>
            <li>
              <strong>Generated collection:</strong> The collection is assembled in your browser. The image is downloaded
              only when you select “Download Collection”; Spoticulum does not upload or retain the generated image.
            </li>
            <li>
              <strong>Technical delivery data:</strong> Hosting and network providers may process IP address, date and time,
              requested URL, response status, referrer, and browser or device information in access and security logs.
            </li>
          </ul>
          <p>
            This processing is necessary to provide the service you request (Article 6(1)(b) GDPR). Security and basic
            delivery logs may also be processed for the legitimate interests of securing and reliably operating the
            service (Article 6(1)(f) GDPR).
          </p>

          <h2>OAuth tokens and browser URLs</h2>
          <p>
            Spoticulum does not maintain an account database. After Spotify authorization, access-token response fields
            are temporarily included in the callback URL and read by the browser so it can call Spotify directly. Those
            values can remain in browser history and may appear in hosting or proxy logs. Do not share the callback URL.
            Select “Log out” when finished, avoid using the service on a shared device, and revoke access from Spotify’s
            <ExternalLink href='https://www.spotify.com/account/apps/'>Apps page</ExternalLink> if needed. The application
            does not intentionally persist Spotify tokens or listening data in its own database.
          </p>

          <h2>Optional Google Analytics</h2>
          <p>
            If Google Analytics is configured, it remains disabled until you select “Allow analytics.” With consent,
            Google Analytics may receive page URLs, interaction events such as a collection download, approximate location
            derived from IP address, and browser or device information. We do not send your Spotify profile or listening
            data to Google Analytics. Advertising features and ad-personalization signals are disabled.
          </p>
          <p>
            Google Analytics may set first-party cookies such as <code>_ga</code> and <code>_ga_&lt;container-id&gt;</code>,
            which Google documents with a default lifetime of up to two years. User-level and event-level Analytics data
            is retained for no longer than 14 months; aggregated reports may remain longer. The legal basis is your consent
            under Article 6(1)(a) GDPR and, where applicable, Section 25(1) TDDDG. Declining analytics does not affect the
            service. You can withdraw consent at any time through “Privacy settings” in the footer; withdrawal applies to
            future processing and removes accessible Analytics cookies from this site.
          </p>

          <h2>Recipients and external services</h2>
          <ul>
            <li>
              <strong>Spotify:</strong> provides authorization, profile and listening data, and image delivery. Review the{' '}
              <ExternalLink href='https://www.spotify.com/legal/privacy-policy/'>Spotify Privacy Policy</ExternalLink>.
            </li>
            <li>
              <strong>Google:</strong> Google Ireland Limited and affiliated processors receive analytics data only after
              consent. Review the <ExternalLink href='https://policies.google.com/privacy'>Google Privacy Policy</ExternalLink>.
            </li>
            <li>
              <strong>Hosting and infrastructure providers:</strong> process technical data as needed to serve and secure
              the website and API.
            </li>
          </ul>
          <p>
            We do not sell personal data or Spotify content and do not use Spotify data for advertising. Data may also be
            disclosed where required by law or necessary to establish, exercise, or defend legal claims.
          </p>

          <h2>International transfers</h2>
          <p>
            Spotify, Google, and infrastructure providers may process data outside the European Economic Area. Depending
            on the provider and destination, transfers rely on an adequacy decision, the EU–US Data Privacy Framework,
            Standard Contractual Clauses, or another lawful safeguard. You may contact us for information about safeguards
            relevant to your data.
          </p>

          <h2>Retention</h2>
          <p>
            Spoticulum keeps no database of Spotify profiles, listening histories, or generated collections. OAuth and
            Spotify data are processed for the active request and browser session. Browser history remains under your
            control. Technical logs are retained only for the period needed for security, troubleshooting, and hosting
            operations, then deleted or anonymized. Analytics retention is described above. Legal records may be retained
            where required by law.
          </p>

          <h2>Your rights</h2>
          <p>
            Subject to the GDPR’s conditions, you may request access, correction, deletion, restriction, or portability of
            your personal data; object to processing based on legitimate interests; and withdraw consent at any time. You
            also have the right to lodge a complaint with a data-protection supervisory authority, particularly in the EU
            Member State where you live, work, or believe an infringement occurred. To exercise a right, email{' '}
            <a href='mailto:spoticulum@ahmeto.com'>spoticulum@ahmeto.com</a>. We may need enough information to verify and answer the request.
          </p>

          <h2>Automated decisions and children</h2>
          <p>
            Spoticulum does not make decisions producing legal or similarly significant effects and does not use Spotify
            data to profile you for advertising. The service is not directed to children under 16. If you believe a child
            has used it, contact us so access can be addressed.
          </p>

          <h2>Security</h2>
          <p>
            We use reasonable technical and organizational safeguards, including keeping the Spotify client secret out of
            the browser, short-lived access tokens, and data minimization. Production deployments are intended to use
            HTTPS. No internet transmission or storage method is completely secure.
          </p>

          <h2>Changes and contact</h2>
          <p>
            We may update this policy when the service, providers, or legal requirements change. The latest effective date
            appears above. Privacy questions and requests may be sent to{' '}
            <a href='mailto:spoticulum@ahmeto.com'>spoticulum@ahmeto.com</a>.
          </p>
        </section>
      </main>
    )
  }
}

export default Legal;
