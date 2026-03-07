import { Link } from 'react-router-dom';
import { Shield, Lock, Share2, Smartphone, Cloud, ChevronRight, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navbar */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">MAGHA Cloud</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-blue-200 hover:text-white transition-colors px-4 py-2"
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition-colors font-medium"
              >
                S'inscrire
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-600/20 rounded-full text-blue-300 text-sm mb-8">
              <Globe className="w-4 h-4 mr-2" />
              Le premier cloud souverain pour l'Afrique
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-white leading-tight mb-6">
              Vos données,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                protégées
              </span>{' '}
              et{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                accessibles
              </span>
            </h1>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto mb-10">
              MAGHA Cloud Secure protège vos fichiers avec un chiffrement AES-256 de niveau militaire.
              Simple, sécurisé et accessible à tous.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-lg"
              >
                Commencer gratuitement
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
              <p className="text-blue-300 text-sm">500 Mo gratuits - Aucune carte requise</p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl translate-x-1/2" />
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Sécurité de niveau entreprise
            </h2>
            <p className="text-blue-200 text-lg max-w-2xl mx-auto">
              Conçu pour protéger vos données les plus sensibles
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Lock className="w-6 h-6" />}
              title="Chiffrement AES-256"
              description="Vos fichiers sont chiffrés avec l'algorithme AES-256, le standard de chiffrement le plus robuste."
            />
            <FeatureCard
              icon={<Share2 className="w-6 h-6" />}
              title="Partage sécurisé"
              description="Partagez vos fichiers en toute sécurité avec un contrôle total sur les accès et les permissions."
            />
            <FeatureCard
              icon={<Smartphone className="w-6 h-6" />}
              title="Authentification MFA"
              description="Protégez votre compte avec l'authentification multi-facteurs via TOTP."
            />
            <FeatureCard
              icon={<Cloud className="w-6 h-6" />}
              title="Cloud accessible"
              description="Accédez à vos fichiers depuis n'importe quel appareil, n'importe où dans le monde."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Des tarifs simples et transparents
            </h2>
            <p className="text-blue-200 text-lg">
              Commencez gratuitement, évoluez selon vos besoins
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <PricingCard
              name="Gratuit"
              price="0€"
              storage="500 Mo"
              features={['Chiffrement AES-256', 'Partage sécurisé', 'Support communautaire']}
            />
            <PricingCard
              name="Starter"
              price="5€"
              storage="5 Go"
              features={['Chiffrement AES-256', 'Partage sécurisé', 'Support email', 'MFA']}
              popular
            />
            <PricingCard
              name="Pro"
              price="15€"
              storage="50 Go"
              features={['Chiffrement AES-256', 'Partage sécurisé', 'Support prioritaire', 'MFA', 'Historique']}
            />
            <PricingCard
              name="Enterprise"
              price="49€"
              storage="500 Go"
              features={['Chiffrement AES-256', 'Partage sécurisé', 'Support 24/7', 'MFA', 'API avancée']}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Prêt à sécuriser vos données ?
          </h2>
          <p className="text-blue-200 text-lg mb-8">
            Rejoignez des milliers d'utilisateurs qui font confiance à MAGHA Cloud
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-lg"
          >
            Créer un compte gratuit
            <ChevronRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">MAGHA Cloud Secure</span>
            </div>
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} MAGHA Cloud Secure. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
      <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function PricingCard({
  name, price, storage, features, popular = false,
}: {
  name: string; price: string; storage: string; features: string[]; popular?: boolean;
}) {
  return (
    <div className={`relative bg-slate-800 rounded-xl p-6 border ${popular ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-700'}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
          Populaire
        </div>
      )}
      <h3 className="text-white font-semibold text-lg">{name}</h3>
      <div className="mt-3 mb-1">
        <span className="text-3xl font-bold text-white">{price}</span>
        {price !== '0€' && <span className="text-slate-400 text-sm">/mois</span>}
      </div>
      <p className="text-blue-400 text-sm mb-6">{storage} de stockage</p>
      <ul className="space-y-3 mb-6">
        {features.map((f, i) => (
          <li key={i} className="text-slate-300 text-sm flex items-start">
            <span className="text-blue-400 mr-2 mt-0.5">&#10003;</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        to="/register"
        className={`block text-center py-2 rounded-lg font-medium transition-colors ${
          popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
        }`}
      >
        Choisir
      </Link>
    </div>
  );
}
