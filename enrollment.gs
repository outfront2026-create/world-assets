/**
 * World Assets enrollment list.
 *
 * This is the private page where you see who enrolled. It runs on Google,
 * which is free. GitHub only hosts the public site. It cannot store the list.
 *
 * Setup, once:
 * 1. Go to https://sheets.google.com and create a blank sheet.
 *    Name it "World Assets enrollments". Leave the sheet shared as private.
 * 2. Extensions → Apps Script. Delete the sample code and paste this file.
 * 3. Click Deploy → New deployment → gear icon → Web app.
 * 4. Execute as: Me. Who has access: Anyone. Deploy.
 * 5. Copy the web app URL (it ends in /exec).
 * 6. Paste that URL into js/site.js as PAYMENT.endpoint, then publish the site again.
 *
 * Do not set the Google Sheet to "anyone with the link".
 * The web app can add a row. It does not give the public a way to read the list.
 */
var HEADERS = [
  "Time (Nairobi)",
  "Receipt",
  "Name",
  "WhatsApp",
  "Email",
  "M-Pesa code",
  "Wants bot quote",
  "Amount"
];

function doPost(e) {
  try {
    var raw = "";
    if (e && e.parameter && e.parameter.payload) raw = e.parameter.payload;
    else if (e && e.postData && e.postData.contents) raw = e.postData.contents;
    var data = JSON.parse(raw || "{}");
    var name = clean(data.name, 80);
    var phone = clean(data.phone, 20);
    if (!name || !phone) {
      return json({ ok: false, error: "Name and WhatsApp number are required." });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      Utilities.formatDate(new Date(), "Africa/Nairobi", "yyyy-MM-dd HH:mm:ss"),
      clean(data.code, 20),
      name,
      phone,
      clean(data.email, 120),
      clean(data.mpesa, 12).toUpperCase(),
      data.bot === "Yes" || data.bot === true ? "Yes" : "No",
      clean(data.amount, 20) || "Ksh 3,000"
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService.createTextOutput("World Assets enrollment endpoint.");
}

function clean(value, max) {
  return String(value || "").replace(/[\r\n\t]/g, " ").trim().slice(0, max);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
