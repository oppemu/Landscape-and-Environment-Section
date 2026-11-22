// Set only on the approved local/private deployment copy; never paste OAuth tokens.
window.HubConfig = {
  paReportEnabled: true, // Fields unlock only after the deployed read-only roster/options reply validates.
  paPublicSummaryEnabled: false, // Public self-reported descriptions only; never opens photo files.
  paVerifiedEvidenceEnabled: false, // Separate, private evidence gateway; does not use the public roster.
  paApiExecutable: '', // Approved read-only Apps Script API Executable URL.
  paOAuthClientId: '', // Public OAuth client ID for the same standard Cloud project.
  bankImportUrl: '',
  api: Object.freeze({spreadsheetId:'1uLeX1WF84RRZgBgpOAcYNFzBtvp2xMnLQnld879hrrc',webAppUrl:'https://script.google.com/a/macros/mahidol.ac.th/s/AKfycbyTbldi4yga51Oo0CnU2MbWhz6B5RaxaHAlOJl2mZCoR-76OAb7j1uHjCwWStU-QSN6Ig/exec'})
};
