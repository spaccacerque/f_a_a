import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sun, 
  ShieldCheck, 
  Home, 
  BatteryCharging, 
  Zap, 
  ArrowRight, 
  CheckCircle2,
  Tractor,
  Sprout,
  Wheat,
  Leaf,
  CreditCard,
  Lock,
  AlertTriangle,
  CalendarClock
} from 'lucide-react';

export default function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [atecoError, setAtecoError] = useState(false);
  const [intendsToInvest, setIntendsToInvest] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      alert("Pagamento completato con successo! Riceverai un'email con i dettagli.");
    }
    if (query.get("canceled")) {
      alert("Pagamento annullato. Puoi riprovare quando vuoi.");
    }
  }, []);

  const handlePayment = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Errore durante la creazione del pagamento.");
      }
    } catch (error) {
      console.error(error);
      alert("Errore di connessione al server.");
    }
  };

  const handleAtecoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "Altro") {
      setAtecoError(true);
    } else {
      setAtecoError(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (atecoError) {
      alert("Il codice ATECO inserito non è ammissibile per questo bando.");
      return;
    }

    setIsSubmitting(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Routing Logic for CRM (passed as hidden fields or just in the payload)
    const consumo = Number(data.Consumo_Annuo_kWh);
    let routing = "Tabella 1A (Fondo Perduto 80%) - Da verificare con consumi";
    if (data.Investimenti_Aumento_Consumi === 'SI') {
      routing += " (Previsti investimenti per aumento consumi)";
    }
    data.Routing_Suggerito = routing;

    try {
      const response = await fetch("https://formsubmit.co/ajax/facility.agrisolare@gmail.com", {
        method: "POST",
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            _subject: "Nuova Richiesta Pre-Screening - Parco Agrisolare",
            _template: "table",
            ...data
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        alert("Si è verificato un errore durante l'invio. Riprova.");
      }
    } catch (error) {
      console.error(error);
      alert("Si è verificato un errore durante l'invio. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-lime-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-stone-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lime-500 to-yellow-400 flex items-center justify-center shadow-md shadow-lime-500/20">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-stone-800">AgriSolare</span>
          </div>
          <a 
            href="#verifica" 
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-lime-100 text-lime-800 hover:bg-lime-200 transition-colors text-sm font-medium"
          >
            Avvia la Pratica
          </a>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-40 pb-12 overflow-hidden">
          {/* Background Glows (Light Theme) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-lime-300/30 rounded-full blur-[120px] opacity-60 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-300/20 rounded-full blur-[100px] opacity-50 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lime-200 bg-lime-50 text-lime-700 text-sm font-medium mb-8 shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
              </span>
              Bando PNRR 2026 Aperto
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[60px] leading-[1.1] font-bold tracking-tight mb-6 max-w-4xl mx-auto text-stone-900"
            >
              L'80% a Fondo Perduto per l'<span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-600 to-yellow-500">Indipendenza Energetica</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[16px] text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Abbatti i costi della bolletta elettrica e riqualifica le strutture della tua azienda agricola, <strong className="text-stone-900 font-medium">senza consumare un solo metro quadro di terreno coltivabile</strong>.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a 
                href="#verifica" 
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-lime-500 text-white font-semibold hover:bg-lime-600 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-lime-500/25"
              >
                Avvia la Pratica Ora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a 
                href="#dettagli" 
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-stone-300 hover:bg-stone-100 transition-colors font-medium text-stone-700"
              >
                Scopri i Dettagli
              </a>
            </motion.div>

            {/* Hero Image - Tetto Agricolo/Stalla */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-16 relative max-w-5xl mx-auto rounded-3xl overflow-hidden border border-stone-200 shadow-2xl shadow-stone-900/10 h-[300px] sm:h-[400px]"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent z-10" />
              <img
                src="https://zgssolutions.it/wp-content/uploads/2025/07/DJI_0156-scaled.jpg"
                alt="Pannelli solari sul tetto di una struttura agricola"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-stone-200 shadow-sm">
                <Leaf className="w-4 h-4 text-lime-600" />
                <span className="text-sm font-medium text-stone-800">Energia Rinnovabile sui Tetti</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 border-y border-stone-200 bg-white">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm font-medium text-stone-500 mb-8 uppercase tracking-widest">Già scelto da oltre 500 aziende agricole in Italia</p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
              <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-stone-50 border border-stone-200 hover:border-lime-300 transition-colors shadow-sm">
                <div className="w-8 h-8 rounded-full bg-lime-100 flex items-center justify-center">
                  <Tractor className="w-4 h-4 text-lime-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-stone-800">Azienda Agricola La Folce</p>
                  <p className="text-xs text-stone-500">150kW installati</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-stone-50 border border-stone-200 hover:border-yellow-300 transition-colors shadow-sm">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Wheat className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-stone-800">Tenuta Colle Urano</p>
                  <p className="text-xs text-stone-500">200kW installati</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-stone-50 border border-stone-200 hover:border-emerald-300 transition-colors shadow-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Sprout className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-stone-800">Le Radici</p>
                  <p className="text-xs text-stone-500">80kW installati</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section with Split Layout */}
        <section id="dettagli" className="py-32 relative bg-stone-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-[60px] font-bold tracking-tight mb-6 text-stone-900">Cosa possiamo finanziare?</h2>
              <p className="text-[16px] text-stone-600 max-w-2xl mx-auto">
                Il bando non paga solo i pannelli solari, ma finanzia un pacchetto completo di riqualificazione per i tetti delle tue stalle, serre e capannoni.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Sticky Image Column - Tetto Serra/Stalla */}
              <div className="hidden lg:block sticky top-32 h-[600px] rounded-3xl overflow-hidden border border-stone-200 shadow-xl shadow-stone-900/5">
                <img 
                  src="hhttps://www.repstatic.it/content/contenthub/img/2023/09/13/140954650-aba5fe2b-f32f-491e-8fac-052120276068.jpg?webp" 
                  alt="Tetto di una serra agricola moderna" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-stone-900/20 to-transparent flex flex-col justify-end p-10">
                  <div className="w-12 h-12 rounded-full bg-lime-500/90 backdrop-blur-md flex items-center justify-center mb-4 border border-lime-400 shadow-lg">
                    <Home className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-3">Riqualificazione Strutturale</h3>
                  <p className="text-stone-200 text-lg leading-relaxed">
                    Migliora l'efficienza delle tue serre e stalle. Finanziamo il rifacimento del tetto, l'isolamento e la rimozione dell'amianto.
                  </p>
                </div>
              </div>

              {/* Feature Cards Column */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-6">
                {[
                  {
                    icon: <Sun className="w-6 h-6 text-yellow-500" />,
                    title: "Impianto Fotovoltaico",
                    desc: "Installato sui tetti di stalle, capannoni, magazzini o serre. Energia pulita a costo zero per le tue attività."
                  },
                  {
                    icon: <ShieldCheck className="w-6 h-6 text-lime-600" />,
                    title: "Bonifica Amianto",
                    desc: "Rimozione e smaltimento sicuro dell'eternit dal tetto della tua struttura agricola, tutelando salute e ambiente."
                  },
                  {
                    icon: <Home className="w-6 h-6 text-emerald-500" />,
                    title: "Rifacimento e Isolamento",
                    desc: "Nuovo tetto, coibentazione termica e sistemi di aerazione ottimali per il benessere animale e la conservazione."
                  },
                  {
                    icon: <BatteryCharging className="w-6 h-6 text-teal-500" />,
                    title: "Sistemi di Accumulo",
                    desc: "Batterie di ultima generazione per immagazzinare l'energia e utilizzarla anche di notte o nei picchi di consumo."
                  },
                  {
                    icon: <Zap className="w-6 h-6 text-yellow-600" />,
                    title: "Colonnine di Ricarica",
                    desc: "Infrastrutture per la ricarica di veicoli e nuovi mezzi agricoli elettrici aziendali."
                  }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="p-8 rounded-3xl bg-white border border-stone-200 hover:border-lime-300 hover:shadow-md transition-all group flex flex-col sm:flex-row gap-6 items-start"
                  >
                    <div className="w-14 h-14 shrink-0 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:scale-110 group-hover:bg-lime-50 transition-all shadow-sm">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 text-stone-800">{feature.title}</h3>
                      <p className="text-[16px] text-stone-600 leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial Section */}
        <section className="py-32 bg-lime-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://i.postimg.cc/CL4Hjb4F/Gemini-Generated-Image-mj1y80mj1y80mj1y-(1).png')] opacity-20 mix-blend-overlay object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-lime-950/90 via-lime-900/80 to-lime-950/90" />
          
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <div className="mb-8 flex justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className="w-6 h-6 text-yellow-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-3xl sm:text-4xl font-medium leading-tight mb-10 text-white">
              "Grazie a questo bando abbiamo azzerato i costi energetici della nostra stalla e rifatto completamente il tetto smaltendo il vecchio amianto. Un'opportunità che ogni azienda agricola dovrebbe cogliere."
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <img 
                src="https://i.postimg.cc/CL4Hjb4F/Gemini-Generated-Image-mj1y80mj1y80mj1y-(1).png" 
                alt="Mario Rossi" 
                className="w-14 h-14 rounded-full border-2 border-lime-400/50"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <div className="font-semibold text-white">Mario Rappuoli</div>
                <div className="text-sm text-lime-200">Titolare, Azienda Agricola F.lli Rappuoli</div>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section id="verifica" className="py-32 relative bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              <div className="sticky top-32">
                <h2 className="text-[50px] font-bold tracking-tight mb-6 leading-tight text-stone-900">
                  Avvia la tua pratica oggi stesso
                </h2>
                <p className="text-[16px] text-stone-600 mb-8 leading-relaxed">
                  Il servizio di simulazione e presentazione della domanda per il bando Parco Agrisolare richiede un'analisi tecnica approfondita. Compila il modulo per inviare i tuoi dati e procedere al pagamento dell'anticipo per l'avvio della pratica.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-12 h-12 shrink-0 bg-red-100 rounded-full flex items-center justify-center">
                    <CalendarClock className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-red-700 uppercase tracking-tight mb-1">Scadenza Imminente</h4>
                    <p className="text-red-600 font-medium">
                      Il termine ultimo per l'inserimento delle domande e il pagamento dell'anticipo è <strong className="font-black text-red-800">VENERDÌ 20</strong>. Oltre questa data non potremo gestire la procedura.
                    </p>
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 mb-8">
                  <h4 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-lime-600" />
                    Cosa include il servizio:
                  </h4>
                  <ul className="space-y-3">
                    {[
                      "Verifica di fattibilità e codice ATECO",
                      "Dimensionamento impianto sui tuoi consumi",
                      "Stima esatta dell'importo a Fondo Perduto",
                      "Preparazione e invio della documentazione ufficiale"
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-lime-500 shrink-0 mt-0.5" />
                        <span className="text-stone-700 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Form Card */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-white border border-stone-200 rounded-3xl p-8 sm:p-10 relative overflow-hidden shadow-2xl shadow-stone-900/5"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-100 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-lime-100 rounded-full blur-[80px] pointer-events-none" />
                
                {isSubmitted ? (
                  <div className="relative z-10 text-center py-8">
                    <div className="w-20 h-20 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="w-10 h-10 text-lime-600" />
                    </div>
                    <h3 className="text-3xl font-bold mb-4 text-stone-800">Richiesta Ricevuta!</h3>
                    <p className="text-stone-600 mb-8 max-w-sm mx-auto">
                      Abbiamo ricevuto i tuoi dati aziendali. Per avviare ufficialmente la pratica di simulazione e presentazione della domanda, è richiesto il pagamento dell'anticipo.
                    </p>
                    
                    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 mb-8 text-left">
                      <h4 className="font-semibold text-stone-800 mb-2 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-stone-500" />
                        Pagamento Sicuro
                      </h4>
                      <p className="text-sm text-stone-500 mb-4">
                        Il pagamento viene gestito in modo sicuro tramite Stripe. Nessun dato della carta viene salvato sui nostri server.
                      </p>
                      <div className="flex justify-between items-center border-t border-stone-200 pt-4">
                        <span className="font-medium text-stone-700">Anticipo Avvio Pratica</span>
                        <span className="font-bold text-xl text-stone-900">€ 250,00</span>
                      </div>
                    </div>

                    <button 
                      onClick={handlePayment}
                      className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-stone-900/20"
                    >
                      <CreditCard className="w-5 h-5" />
                      Paga l'Anticipo Ora
                    </button>
                    <p className="text-xs text-stone-500 mt-4">
                      Verrai reindirizzato al portale di pagamento sicuro di Stripe.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-semibold mb-6 text-stone-800 relative z-10">Dati Aziendali</h3>
                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-stone-600">Nome e Cognome</label>
                          <input 
                            type="text" 
                            name="Nome"
                            required
                            placeholder="Mario Rossi"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-stone-600">Nome Azienda Agricola</label>
                          <input 
                            type="text" 
                            name="Azienda"
                            required
                            placeholder="Azienda Agricola Rossi"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-600">Codice ATECO Prevalente</label>
                        <select 
                          name="Codice_ATECO" 
                          required
                          onChange={handleAtecoChange}
                          className={`w-full bg-stone-50 border ${atecoError ? 'border-red-500 ring-1 ring-red-500' : 'border-stone-200'} rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm appearance-none`}
                        >
                          <option value="">Seleziona il tuo settore ATECO...</option>
                          <option value="01 - Coltivazioni agricole e produzione di prodotti animali">01 - Coltivazioni agricole e produzione di prodotti animali</option>
                          <option value="02 - Silvicoltura ed utilizzo di aree forestali">02 - Silvicoltura ed utilizzo di aree forestali</option>
                          <option value="03 - Pesca e acquacoltura">03 - Pesca e acquacoltura</option>
                          <option value="10 - Industrie alimentari">10 - Industrie alimentari</option>
                          <option value="11 - Industria delle bevande">11 - Industria delle bevande</option>
                          <option value="Altro">Altro (es. Artigianato, Edilizia, Commercio)</option>
                        </select>
                        {atecoError && (
                          <p className="text-sm text-red-600 flex items-start gap-1 mt-1">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            Attenzione: il codice ATECO inserito non rientra nell'elenco degli ammissibili (Allegato B). La misura è riservata a imprese agricole e agroindustriali.
                          </p>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-stone-600">Data Inizio Attività (CCIAA)</label>
                          <input 
                            type="date" 
                            name="Data_Inizio_Attivita"
                            required
                            max="2025-02-28"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-stone-600">Categoria Catastale Immobile</label>
                          <input 
                            type="text" 
                            name="Categoria_Catastale"
                            required
                            placeholder="Es. D/10"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-600">Titolo di Disponibilità Immobile</label>
                        <select 
                          name="Titolo_Disponibilita" 
                          required
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm appearance-none"
                        >
                          <option value="">Seleziona...</option>
                          <option value="Proprietà">Proprietà</option>
                          <option value="Diritto di superficie">Diritto di superficie</option>
                          <option value="Locazione registrata">Locazione registrata</option>
                          <option value="Comodato d'uso registrato">Comodato d'uso registrato</option>
                        </select>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-stone-600">Consumo Annuo (kWh)</label>
                          <input 
                            type="number" 
                            name="Consumo_Annuo_kWh"
                            required
                            placeholder="Es. 45000"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-stone-600">Intenzione di investire per aumentare i consumi?</label>
                          <select 
                            name="Investimenti_Aumento_Consumi" 
                            required
                            onChange={(e) => setIntendsToInvest(e.target.value === 'SI')}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm appearance-none"
                          >
                            <option value="">Seleziona...</option>
                            <option value="SI">SI</option>
                            <option value="NO">NO</option>
                          </select>
                        </div>
                      </div>

                      {intendsToInvest && (
                        <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 text-sm text-lime-800 flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 shrink-0 text-lime-600 mt-0.5" />
                          <p>
                            <strong>Nota bene:</strong> Poiché hai intenzione di effettuare investimenti per aumentare i consumi, sarai contattato da un nostro consulente per approfondire i dettagli e valutare il corretto dimensionamento dell'impianto.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-600">Rimozione Amianto da smaltire?</label>
                        <select 
                          name="Rimozione_Amianto" 
                          required
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm appearance-none"
                        >
                          <option value="">Seleziona...</option>
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-600">Email</label>
                        <input 
                          type="email" 
                          name="Email"
                          required
                          placeholder="mario@esempio.it"
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-600">Telefono</label>
                        <input 
                          type="tel" 
                          name="Telefono"
                          required
                          placeholder="+39 333 1234567"
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-stone-600">Dettagli Intervento (Opzionale)</label>
                        <textarea 
                          name="Note"
                          rows={3}
                          placeholder="Es. Ho una stalla con tetto in eternit da smaltire..."
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all resize-none shadow-sm"
                        />
                      </div>

                      <div className="space-y-4 pt-4 border-t border-stone-200">
                        <h4 className="font-semibold text-stone-800">Dichiarazioni e Requisiti</h4>
                        
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" required className="mt-1 w-4 h-4 text-lime-600 rounded border-stone-300 focus:ring-lime-500" />
                          <span className="text-sm text-stone-600">
                            Dichiaro di avere un volume d'affari annuo &gt; 7.000 € e di NON essere in regime di esonero IVA.
                          </span>
                        </label>
                        
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" required className="mt-1 w-4 h-4 text-lime-600 rounded border-stone-300 focus:ring-lime-500" />
                          <span className="text-sm text-stone-600">
                            Dichiaro che l'impresa è attiva e regolarmente iscritta al Registro delle Imprese.
                          </span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" required className="mt-1 w-4 h-4 text-lime-600 rounded border-stone-300 focus:ring-lime-500" />
                          <span className="text-sm text-stone-600">
                            Dichiaro che l'impresa NON è in difficoltà ai sensi del Regolamento GBER e non è soggetta a procedure concorsuali.
                          </span>
                        </label>

                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" required className="mt-1 w-4 h-4 text-lime-600 rounded border-stone-300 focus:ring-lime-500" />
                          <span className="text-sm text-stone-600">
                            Confermo che l'impianto sarà installato su copertura di fabbricato esistente o serra (non a terra).
                          </span>
                        </label>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-stone-200">
                        <h4 className="font-semibold text-stone-800">Checklist Documentale</h4>
                        <p className="text-sm text-stone-500">Dichiaro di avere a disposizione i seguenti documenti (da caricare successivamente):</p>
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" required className="mt-1 w-4 h-4 text-lime-600 rounded border-stone-300 focus:ring-lime-500" />
                          <span className="text-sm text-stone-600">
                            Visura Camerale aggiornata (Max 6 mesi), Documento d'identità del Legale Rappresentante, Titolo di disponibilità dell'immobile, Bollette elettriche.
                          </span>
                        </label>
                      </div>

                      <div className="pt-4 border-t border-stone-200">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" required className="mt-1 w-4 h-4 text-lime-600 rounded border-stone-300 focus:ring-lime-500" />
                          <span className="text-sm text-stone-600 font-medium">
                            Confermo di voler avviare la pratica e sono consapevole che il servizio richiede il pagamento di un anticipo. Accetto l'informativa sulla privacy.
                          </span>
                        </label>
                      </div>

                      <button 
                        type="submit" 
                        disabled={isSubmitting || atecoError}
                        className="w-full bg-lime-500 hover:bg-lime-600 disabled:bg-lime-400 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors mt-4 flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Invio in corso...
                          </span>
                        ) : (
                          <>
                            Invia e Vai al Pagamento
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      <p className="text-xs text-stone-500 text-center mt-4">
                        Cliccando il pulsante invierai i tuoi dati e riceverai le istruzioni per il pagamento dell'anticipo.
                      </p>
                    </form>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-12 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-lime-600" />
            <span className="font-semibold text-lg text-stone-800">AgriSolare</span>
          </div>
          <p className="text-sm text-stone-500">
            © 2026 AgriSolare. Tutti i diritti riservati. Landing page per Bando Parco Agrisolare.
          </p>
          <div className="flex gap-4 text-sm text-stone-500">
            <a href="#" className="hover:text-stone-700 transition-colors">Privacy</a>
            <a href="#" className="hover:text-stone-700 transition-colors">Termini</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

