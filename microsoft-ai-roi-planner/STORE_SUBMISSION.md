# Microsoft Store submission — AI Automation ROI Planner

## Product decision

- Product name: AI Automation ROI Planner
- Short name: AI ROI Planner
- App type: PWA packaged for Microsoft Store
- Primary category: Business
- Subcategory: Data + analytics
- Secondary category: Productivity
- Price: Free
- Monetization: Free app → external $49 AI Agent Business Case Studio
- Commerce declaration: This product allows users to make purchases, but does not use Microsoft Store commerce.
- Generative AI declaration: No. The app evaluates user-entered assumptions; it does not generate AI content.
- Target devices: Windows desktop/laptop only for v1; do not target Xbox.
- Markets: All supported markets unless Partner Center flags a legal/compliance reason to restrict.
- Language: English (United States) for v1.

## Store short description

Estimate AI automation savings, payback period, and first-year ROI. Save scenarios on your device, compare business cases, export CSV, and work offline without creating an account.

## Store description

AI Automation ROI Planner helps business owners, operators, consultants, and automation teams decide whether an AI workflow is worth implementing before they commit time or budget.

Enter a few practical assumptions — workflow frequency, time per run, loaded labor cost, expected automation percentage, monthly software/API cost, and one-time setup cost. The app immediately estimates monthly hours saved, monthly net savings, payback period, and first-year ROI.

The planner turns the result into a simple decision signal: GO, TEST, or HOLD. The signal is based on modeled economics and is designed to help you identify which assumptions need validation before an implementation decision.

Built for repeated desktop use:

• Save up to 50 scenarios locally on your device
• Compare different workflows or implementation options
• Export saved scenarios as CSV
• Use the core calculator offline after installation
• No account required
• No ads
• No third-party behavioral analytics in this version
• No access to camera, microphone, location, contacts, or email

Your scenario inputs stay in local storage on your device. The app does not transmit the workflow names or cost assumptions you enter to Stratum Praxis.

AI Automation ROI Planner is decision-support software, not financial advice. Results depend on your assumptions and do not guarantee realized savings. For material decisions, validate assumptions using measured workflow data and an appropriate pilot.

For teams that need a more complete approval-ready business case, the app includes an optional external link to AI Agent Business Case Studio.

## Product features

1. AI automation ROI and payback calculator
2. Monthly labor-capacity savings estimate
3. First-year ROI estimate
4. GO / TEST / HOLD decision signal
5. Local scenario history with no account
6. CSV export for saved scenarios
7. Offline-ready Progressive Web App
8. Responsive Windows desktop interface
9. Privacy-first design with no sensitive permissions
10. Optional external business-case upgrade

## Keywords

Use no more than 7 keywords and no more than 21 total words.

1. automation calculator
2. business ROI
3. payback calculator
4. workflow savings
5. AI business case
6. productivity calculator
7. cost savings

## Support and policy URLs

After merge/deploy, use:

- Privacy Policy: https://stratumpraxis.com/microsoft-ai-roi-planner/privacy.html
- Support: https://stratumpraxis.com/
- Terms: https://stratumpraxis.com/microsoft-ai-roi-planner/terms.html

## Store asset plan

Required / recommended desktop screenshots:

1. 1366×768+ — Main planner with realistic assumptions and calculated ROI
   Caption: Estimate savings, payback, and first-year ROI from practical workflow assumptions.
2. 1366×768+ — Decision snapshot showing GO / TEST / HOLD result
   Caption: Turn modeled economics into a clear implementation decision signal.
3. 1366×768+ — Saved scenarios table
   Caption: Save and compare automation opportunities locally on your device.
4. 1366×768+ — CSV export / offline-ready app view
   Caption: Export scenarios for review and keep the core planner available offline.

Recommended Store tile icon: 300×300 PNG generated from icon.svg.
PWA package icons: provide at minimum 192×192 and 512×512 PNG versions of icon.svg before final PWABuilder packaging.

## Age rating answers

Use truthful answers in Partner Center. Expected v1 profile:

- No violence
- No sexual content
- No controlled substances
- No gambling
- No user-generated content
- No social interaction
- No unrestricted web browsing
- No location sharing
- No mature themes
- Business utility / calculator only

Do not blindly accept this section if Partner Center asks a differently worded question; answer based on the actual v1 behavior.

## Capabilities / permissions

Declare no restricted capabilities. The app does not need camera, microphone, location, contacts, email, broad file-system access, or device hardware access. CSV download uses the standard browser/PWA download flow initiated by the user.

## Certification notes

AI Automation ROI Planner is a static PWA. Core calculations run client-side. Scenario history is stored locally in browser/PWA localStorage. No login is required. The app links externally to Payhip only when a user chooses the optional paid business-case product. No purchase is required to use the advertised calculator, history, comparison, export, or offline functionality.

## Packaging path

1. Deploy this folder over HTTPS.
2. Validate the live URL in PWABuilder.
3. In Partner Center, create New product → MSIX or PWA app and reserve “AI Automation ROI Planner” if available.
4. Record Product ID / Package ID, Publisher ID, and Publisher display name from Product identity.
5. Generate the Store package with PWABuilder using the Partner Center identity values.
6. Upload the generated MSIX/MSIXUPLOAD package to the submission.
7. Complete Pricing and availability, Properties, Age ratings, Packages, Store listings, and Submission options.
8. Submit for certification.

## Official Microsoft references checked for this launch

- https://learn.microsoft.com/en-us/windows/apps/publish/get-started
- https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/pwa/turn-your-website-pwa
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/pwa/create-app-submission
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/pwa/add-and-edit-store-listing-info
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/pwa/screenshots-and-images
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/pwa/categories-and-subcategories
- https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
- https://learn.microsoft.com/en-us/windows/apps/publish/partner-center/open-a-developer-account
