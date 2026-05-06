import nodemailer from 'nodemailer';

interface Attachment {
    filename: string;
    content: Buffer;
    contentType?: string;
}

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Attachment[];
}

export async function sendEmail({ to, subject, html, attachments }: EmailOptions) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error("Configuration SMTP manquante (SMTP_USER et SMTP_PASS requis)");
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Rentmaestro" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            attachments: attachments?.map(a => ({
                filename: a.filename,
                content: a.content,
                contentType: a.contentType ?? 'application/pdf',
            })),
        });

        console.log("Email envoyé: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email :", error);
        throw new Error("Impossible d'envoyer l'email.");
    }
}
