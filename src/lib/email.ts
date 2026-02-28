import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error("Configuration SMTP manquante dans le fichier .env (SMTP_USER et SMTP_PASS requis)");
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Rentmaestro" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });

        console.log("Email envoyé: %s", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email :", error);
        throw new Error("Impossible d'envoyer l'email.");
    }
}
