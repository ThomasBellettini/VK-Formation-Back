import cst from "../server/constants.js";
import * as Brevo from "@getbrevo/brevo";

let apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(0, cst.BREVO.API_KEY || "");

export async function sendTemplateEmail(
  templateId: number,
  params: any,
  email: string
) {
  try {
    let sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.templateId = templateId;
    sendSmtpEmail.to = [{ email: email }];
    sendSmtpEmail.params = params;
    sendSmtpEmail.headers = {
      "X-Mailin-custom": "custom_header_1:custom_value_1",
    };

    let response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
