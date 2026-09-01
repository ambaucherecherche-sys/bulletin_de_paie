import nodemailer from 'nodemailer';

export async function envoyerEmailInvitation(params: {
  destinataire: string
  nom: string
  motDePasseTemporaire: string
  role: string
  expiresAt: Date
}): Promise<void> {
  const { destinataire, nom, motDePasseTemporaire, role, expiresAt } = params;

  // Configuration du transporteur SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;
  
  const formatDate = (date: Date) => {
    return date.toLocaleString('fr-FR', {
      timeZone: 'UTC', // Adapt to your needs
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const mailOptions = {
    from: process.env.SMTP_FROM || '"SOLUTECH Paie" <noreply@solutech.tg>',
    to: destinataire,
    subject: 'Votre accès au système SOLUTECH Paie',
    text: `
Bonjour ${nom},

Votre compte a été créé sur le système de gestion des bulletins de paie SOLUTECH.

Email      : ${destinataire}
Mot de passe temporaire : ${motDePasseTemporaire}

⚠️ Ce mot de passe expire le ${formatDate(expiresAt)} (48h).
Lors de votre première connexion, vous serez invité à changer ce mot de passe.

URL : ${url}
Rôle attribué : ${role}
    `.trim(),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email d'invitation envoyé à ${destinataire}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de l'email à ${destinataire}:`, error);
    // On ne jette pas d'erreur pour ne pas bloquer la création de l'utilisateur
  }
}
