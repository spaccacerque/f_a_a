import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import path from "path";

// Inizializza Stripe con la chiave fornita dall'utente (se in produzione, avvisa se manca la variabile d'ambiente)
const isProd = process.env.NODE_ENV === "production";
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_remove_this";

if (isProd && !process.env.STRIPE_SECRET_KEY) {
  console.warn("🚨 ATTENZIONE: Nessuna STRIPE_SECRET_KEY fornita in ambiente di produzione. Verrà usata la chiave di test ma NON funzioneranno i pagamenti reali.");
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2025-02-24.acacia",
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Endpoint per creare la sessione di checkout di Stripe
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "Anticipo Avvio Pratica - Parco Agrisolare",
                description: "Verifica fattibilità, dimensionamento impianto e preparazione documentazione.",
              },
              // MODIFICA QUESTO VALORE PER FARE UN TEST REALE CON UN IMPORTO BASSO (es. 100 per 1,00 €)
              unit_amount: 25000, // 250.00 €
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/?success=true`,
        cancel_url: `${req.protocol}://${req.get("host")}/?canceled=true`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Errore Stripe:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
