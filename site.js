/* Payment line for the cohort.
   endpoint: paste the Google Apps Script web app URL from scripts/enrollment.gs.
   That Google Sheet is the private page where you see who enrolled.
   Leave endpoint empty until the script is deployed. */
var PAYMENT = {
  business: "World Assets",
  mpesaName: "World Assets",
  mpesaNumber: "0794 612 206",
  paybill: "",
  account: "WORLD ASSETS",
  whatsappNumber: "0794612206",
  amountLabel: "Ksh 3,000",
  endpoint: ""
};

(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function digits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function validPhone(value) {
    return /^(?:\+254|254|0)7\d{8}$/.test(String(value).replace(/[\s-]/g, ""));
  }

  function destinationText() {
    if (PAYMENT.mpesaNumber) {
      return "M-Pesa Send Money\nName: " + PAYMENT.mpesaName + "\nNumber: " + PAYMENT.mpesaNumber;
    }
    if (PAYMENT.paybill) {
      return "Lipa na M-Pesa\nPaybill: " + PAYMENT.paybill + "\nAccount: " + PAYMENT.account + "\nName: " + PAYMENT.mpesaName;
    }
    return "";
  }

  function renderDestination() {
    var box = document.getElementById("pay-dest");
    if (!box) return;
    var dest = destinationText();
    if (!dest) {
      box.className = "pay-dest is-wait";
      box.innerHTML = "<p>Do not send money yet. The M-Pesa number or paybill for World Assets is not on this page. You can still prepare a receipt below. Pay only when a number is printed here.</p>";
      return;
    }
    box.className = "pay-dest";
    if (PAYMENT.mpesaNumber) {
      box.innerHTML = "<p class=\"spec-label\">M-Pesa Send Money</p><p class=\"pay-number\">" + escapeHtml(PAYMENT.mpesaNumber) + "</p><p class=\"fine\">Name on the line: " + escapeHtml(PAYMENT.mpesaName) + "</p>";
    } else {
      box.innerHTML = "<p class=\"spec-label\">Lipa na M-Pesa</p><p class=\"pay-number\">" + escapeHtml(PAYMENT.paybill) + "</p><p class=\"fine\">Account number: " + escapeHtml(PAYMENT.account) + "<br>Name: " + escapeHtml(PAYMENT.mpesaName) + "</p>";
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setupNav() {
    var toggle = document.getElementById("nav-toggle");
    var nav = document.getElementById("nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    var links = nav.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    }
  }

  function fieldError(id, message) {
    var input = document.getElementById(id);
    var slot = document.getElementById(id + "-error");
    if (!slot) return;
    if (message) {
      slot.hidden = false;
      slot.textContent = message;
      if (input) input.setAttribute("aria-invalid", "true");
    } else {
      slot.hidden = true;
      slot.textContent = "";
      if (input) input.removeAttribute("aria-invalid");
    }
  }

  function receiptCode() {
    return "WA-" + String(Math.floor(1000 + Math.random() * 9000));
  }

  function buildReceipt(data) {
    var lines = [
      "WORLD ASSETS",
      "Trading strategy seat",
      "",
      "Receipt: " + data.code,
      "Name: " + data.name,
      "WhatsApp: " + data.phone,
      "Email: " + (data.email || "—"),
      "Bot quote: " + (data.bot ? "Yes, send a price" : "No"),
      "Amount due: " + PAYMENT.amountLabel,
      "Payable to: " + PAYMENT.business
    ];
    var dest = destinationText();
    if (dest) lines.push(dest);
    lines.push("Reference: " + data.code);
    if (data.mpesa) lines.push("M-Pesa code entered: " + data.mpesa.toUpperCase());
    lines.push("");
    lines.push("A seat is confirmed when this Ksh 3,000 payment is matched.");
    lines.push("Ksh 300 a day is a goal. It depends on your capital, your risk, and market conditions.");
    lines.push("The fee is the seat. It is not trading capital.");
    return lines.join("\n");
  }

  function whatsappHref(text) {
    var raw = digits(PAYMENT.whatsappNumber);
    if (!raw) return "";
    if (raw.charAt(0) === "0") raw = "254" + raw.slice(1);
    return "https://wa.me/" + raw + "?text=" + encodeURIComponent(text);
  }

  function setListStatus(kind, message) {
    var slot = document.getElementById("list-status");
    if (!slot) return;
    slot.hidden = false;
    slot.className = "form-note list-status " + kind;
    slot.textContent = message;
  }

  function sendEnrollment(payload) {
    if (!PAYMENT.endpoint) return Promise.resolve("local");
    var body = new URLSearchParams();
    body.set("payload", JSON.stringify({
      code: payload.code,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      mpesa: (payload.mpesa || "").toUpperCase(),
      bot: payload.bot ? "Yes" : "No",
      amount: PAYMENT.amountLabel
    }));
    return fetch(PAYMENT.endpoint, { method: "POST", body: body })
      .then(function (res) {
        return res.json().catch(function () { return { ok: res.ok }; });
      })
      .then(function (data) {
        return data && data.ok ? "sent" : "failed";
      })
      .catch(function () { return "failed"; });
  }

  function setupForm() {
    var form = document.getElementById("seat-form");
    if (!form) return;
    var receipt = document.getElementById("receipt");
    var receiptBody = document.getElementById("receipt-body");
    var copyBtn = document.getElementById("copy-receipt");
    var waBtn = document.getElementById("wa-receipt");
    var submitBtn = form.querySelector("button[type=submit]");
    var enrollNote = document.getElementById("enroll-note");
    var sending = false;

    if (enrollNote) {
      enrollNote.textContent = PAYMENT.endpoint
        ? "Your name, WhatsApp number, email, and M-Pesa code are added to the private World Assets enrollment sheet. Copy the receipt and keep the M-Pesa SMS. A seat is confirmed when the Ksh 3,000 payment is matched."
        : "The enrollment list is not connected yet, so this receipt stays on your device. Copy it and keep the M-Pesa SMS. A seat is confirmed when the Ksh 3,000 payment is matched.";
    }
    if (submitBtn && PAYMENT.endpoint) submitBtn.textContent = "Save my seat";

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = document.getElementById("name").value.trim();
      var phone = document.getElementById("phone").value.trim();
      var email = document.getElementById("email").value.trim();
      var codeInput = document.getElementById("mpesa").value.trim();
      var risk = document.getElementById("risk-ok").checked;
      var fee = document.getElementById("fee-ok").checked;
      var bot = document.getElementById("bot").checked;
      var ok = true;

      fieldError("name", name.length < 3 ? "Enter the name you will pay with." : "");
      if (name.length < 3) ok = false;

      fieldError("phone", validPhone(phone) ? "" : "Use a Safaricom number, like 0712 345 678.");
      if (!validPhone(phone)) ok = false;

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fieldError("email", "That email does not look complete.");
        ok = false;
      } else {
        fieldError("email", "");
      }

      if (codeInput && !/^[A-Z0-9]{10}$/i.test(codeInput)) {
        fieldError("mpesa", "M-Pesa codes are 10 letters and numbers.");
        ok = false;
      } else {
        fieldError("mpesa", "");
      }

      fieldError("risk-ok", risk ? "" : "Confirm you have read the risk line.");
      fieldError("fee-ok", fee ? "" : "Confirm the amount you are paying.");
      if (!risk || !fee) ok = false;

      if (!ok) {
        var firstInvalid = form.querySelector("[aria-invalid='true']");
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      if (sending) return;

      var payload = {
        code: receiptCode(),
        name: name,
        phone: phone,
        email: email,
        mpesa: codeInput,
        bot: bot
      };
      var text = buildReceipt(payload);
      receiptBody.textContent = text;
      receipt.hidden = false;
      try {
        sessionStorage.setItem("wa-receipt", text);
      } catch (err) {
        /* private mode */
      }

      var href = whatsappHref(text);
      if (href) {
        waBtn.hidden = false;
        waBtn.href = href;
      } else {
        waBtn.hidden = true;
      }

      sending = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving";
      }
      setListStatus("is-wait", PAYMENT.endpoint ? "Saving this seat to the enrollment list." : "This receipt is on your device. The enrollment list is not connected yet.");
      receipt.scrollIntoView({ behavior: "smooth", block: "start" });

      sendEnrollment(payload).then(function (result) {
        sending = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = PAYMENT.endpoint ? "Save my seat" : "Build my receipt";
        }
        if (result === "sent") {
          setListStatus("is-sent", "Saved. This seat is on the World Assets enrollment list.");
        } else if (result === "failed") {
          setListStatus("is-wait", "The receipt is on this device, but it did not reach the enrollment list. Submit again in a moment.");
        }
      });
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var text = receiptBody.textContent || "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            copyBtn.textContent = "Copied";
          }, function () {
            copyBtn.textContent = "Copy failed";
          });
        }
      });
    }
  }

  ready(function () {
    var year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
    setupNav();
    renderDestination();
    setupForm();
  });
})();
