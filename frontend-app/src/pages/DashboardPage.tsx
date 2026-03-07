import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { filesAPI, storageAPI, authAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Upload, FileText, Trash2, Download, Share2, LogOut,
  HardDrive, Settings, Users, FolderOpen, X, Copy, Check
} from 'lucide-react';

interface FileItem {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface StorageQuota {
  plan: string;
  storage_used: number;
  storage_limit: number;
  usage_percentage: number;
  plan_price: number;
}

interface ShareInfo {
  id: number;
  file_id: number;
  filename: string;
  owner_email: string;
  shared_with_email: string | null;
  permission: string;
  share_token: string | null;
  expires_at: string | null;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DashboardPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedFiles, setSharedFiles] = useState<ShareInfo[]>([]);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'shared' | 'settings'>('files');
  const [shareModal, setShareModal] = useState<{ fileId: number; fileName: string } | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareResult, setShareResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [filesRes, quotaRes, sharedRes] = await Promise.all([
        filesAPI.list(),
        storageAPI.getQuota(),
        filesAPI.listSharedWithMe(),
      ]);
      setFiles(filesRes.data.files);
      setQuota(quotaRes.data);
      setSharedFiles(sharedRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        await filesAPI.upload(fileList[i]);
      }
      await loadData();
      await refreshUser();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      alert(error.response?.data?.detail || 'Erreur lors du téléversement');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const res = await filesAPI.download(file.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors du téléchargement');
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce fichier ?')) return;
    try {
      await filesAPI.delete(fileId);
      await loadData();
      await refreshUser();
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const handleShare = async () => {
    if (!shareModal) return;
    try {
      const res = await filesAPI.share(shareModal.fileId, {
        shared_with_email: shareEmail || undefined,
        permission: 'read',
      });
      setShareResult(res.data.share_token);
      setShareEmail('');
      await loadData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      alert(error.response?.data?.detail || 'Erreur lors du partage');
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">MAGHA Cloud</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-300 text-sm hidden sm:block">
                {user?.full_name || user?.username}
              </span>
              <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-medium rounded-full uppercase">
                {user?.plan}
              </span>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Storage Bar */}
        {quota && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">Stockage</span>
              </div>
              <span className="text-slate-400 text-sm">
                {formatBytes(quota.storage_used)} / {formatBytes(quota.storage_limit)}
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  quota.usage_percentage > 90 ? 'bg-red-500' :
                  quota.usage_percentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(quota.usage_percentage, 100)}%` }}
              />
            </div>
            <p className="text-slate-400 text-xs mt-2">
              {quota.usage_percentage.toFixed(1)}% utilisé
              {quota.plan === 'free' && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className="ml-2 text-blue-400 hover:text-blue-300"
                >
                  Passer au plan premium →
                </button>
              )}
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === 'files' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Mes fichiers</span>
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === 'shared' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Partagés avec moi</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </button>
        </div>

        {/* My Files Tab */}
        {activeTab === 'files' && (
          <div>
            {/* Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-300 mb-2">
                Glissez vos fichiers ici ou{' '}
                <label className="text-blue-400 hover:text-blue-300 cursor-pointer font-medium">
                  parcourez
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                    disabled={uploading}
                  />
                </label>
              </p>
              <p className="text-slate-500 text-sm">
                Tous les fichiers sont chiffrés avec AES-256
              </p>
              {uploading && (
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-400">Téléversement en cours...</span>
                </div>
              )}
            </div>

            {/* Files List */}
            {files.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Aucun fichier</p>
                <p className="text-slate-500 text-sm mt-2">Téléversez votre premier fichier pour commencer</p>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 text-sm font-medium text-slate-400 border-b border-slate-700 hidden sm:grid">
                  <div className="col-span-5">Nom</div>
                  <div className="col-span-2">Taille</div>
                  <div className="col-span-3">Date</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 gap-4 p-4 items-center border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="col-span-12 sm:col-span-5 flex items-center space-x-3">
                      <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
                      <span className="text-white truncate">{file.original_filename}</span>
                    </div>
                    <div className="col-span-4 sm:col-span-2 text-slate-400 text-sm">
                      {formatBytes(file.file_size)}
                    </div>
                    <div className="col-span-4 sm:col-span-3 text-slate-400 text-sm">
                      {new Date(file.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="col-span-4 sm:col-span-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShareModal({ fileId: file.id, fileName: file.original_filename })}
                        className="p-2 text-slate-400 hover:text-green-400 transition-colors"
                        title="Partager"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Shared With Me Tab */}
        {activeTab === 'shared' && (
          <div>
            {sharedFiles.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">Aucun fichier partagé</p>
                <p className="text-slate-500 text-sm mt-2">Les fichiers partagés avec vous apparaîtront ici</p>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {sharedFiles.map((share) => (
                  <div
                    key={share.id}
                    className="p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{share.filename}</p>
                        <p className="text-slate-400 text-sm">Partagé par {share.owner_email}</p>
                      </div>
                      <button
                        onClick={() => handleDownload({ id: share.file_id, original_filename: share.filename } as FileItem)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTab user={user} refreshUser={refreshUser} />
        )}
      </div>

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Partager: {shareModal.fileName}
              </h3>
              <button
                onClick={() => { setShareModal(null); setShareResult(null); }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {shareResult ? (
              <div>
                <p className="text-green-400 mb-3">Fichier partagé avec succès !</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareResult}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={() => handleCopyToken(shareResult)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  onClick={() => { setShareModal(null); setShareResult(null); }}
                  className="w-full mt-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email du destinataire (optionnel)
                  </label>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="destinataire@email.com"
                  />
                  <p className="text-slate-400 text-xs mt-2">
                    Laissez vide pour générer un lien de partage
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => { setShareModal(null); setShareResult(null); }}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Partager
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsTabProps {
  user: {
    id: number;
    email: string;
    username: string;
    full_name: string;
    plan: string;
    mfa_enabled: boolean;
  } | null;
  refreshUser: () => Promise<void>;
}

function SettingsTab({ user, refreshUser }: SettingsTabProps) {
  const [plans, setPlans] = useState<Array<{
    name: string;
    storage: string;
    price_eur: number;
    features: string[];
  }>>([]);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; qr_code: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');

  useEffect(() => {
    storageAPI.getPlans().then((res) => setPlans(res.data));
  }, []);

  const handleUpgrade = async (plan: string) => {
    try {
      await storageAPI.upgrade(plan);
      await refreshUser();
      alert(`Plan mis à jour : ${plan}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      alert(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleSetupMFA = async () => {
    try {
      const res = await authAPI.setupMFA();
      setMfaSetup(res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      alert(error.response?.data?.detail || 'Erreur');
    }
  };

  const handleVerifyMFA = async () => {
    try {
      await authAPI.verifyMFA(mfaCode);
      setMfaMessage('MFA activé avec succès !');
      setMfaSetup(null);
      setMfaCode('');
      await refreshUser();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setMfaMessage(error.response?.data?.detail || 'Code invalide');
    }
  };

  const handleDisableMFA = async () => {
    const code = prompt('Entrez votre code MFA pour désactiver :');
    if (!code) return;
    try {
      await authAPI.disableMFA(code);
      await refreshUser();
      alert('MFA désactivé');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      alert(error.response?.data?.detail || 'Erreur');
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Profil</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400">Nom</label>
            <p className="text-white">{user?.full_name || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-slate-400">Nom d'utilisateur</label>
            <p className="text-white">{user?.username}</p>
          </div>
          <div>
            <label className="text-sm text-slate-400">Email</label>
            <p className="text-white">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-slate-400">Plan</label>
            <p className="text-white capitalize">{user?.plan}</p>
          </div>
        </div>
      </div>

      {/* MFA */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          Authentification multi-facteurs (MFA)
        </h3>
        {user?.mfa_enabled ? (
          <div>
            <p className="text-green-400 mb-4">MFA est activé sur votre compte</p>
            <button
              onClick={handleDisableMFA}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Désactiver MFA
            </button>
          </div>
        ) : mfaSetup ? (
          <div>
            <p className="text-slate-300 mb-4">
              Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center mb-4">
              <img src={mfaSetup.qr_code} alt="QR Code MFA" className="w-48 h-48 bg-white p-2 rounded-lg" />
            </div>
            <p className="text-slate-400 text-sm mb-4 text-center">
              Clé secrète : <code className="bg-slate-700 px-2 py-1 rounded">{mfaSetup.secret}</code>
            </p>
            <div className="flex space-x-3">
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Entrez le code à 6 chiffres"
                maxLength={6}
              />
              <button
                onClick={handleVerifyMFA}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Vérifier
              </button>
            </div>
            {mfaMessage && (
              <p className={`mt-3 text-sm ${mfaMessage.includes('succès') ? 'text-green-400' : 'text-red-400'}`}>
                {mfaMessage}
              </p>
            )}
          </div>
        ) : (
          <div>
            <p className="text-slate-300 mb-4">
              Protégez votre compte avec l'authentification à deux facteurs
            </p>
            <button
              onClick={handleSetupMFA}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Activer MFA
            </button>
          </div>
        )}
      </div>

      {/* Plans */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Plans de stockage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-slate-800 rounded-xl p-6 border transition-colors ${
                user?.plan === plan.name ? 'border-blue-500' : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <h4 className="text-white font-semibold capitalize text-lg">{plan.name}</h4>
              <p className="text-3xl font-bold text-white mt-2">
                {plan.price_eur === 0 ? 'Gratuit' : `${plan.price_eur}€`}
                {plan.price_eur > 0 && <span className="text-sm font-normal text-slate-400">/mois</span>}
              </p>
              <p className="text-blue-400 mt-1">{plan.storage}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="text-slate-300 text-sm flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {user?.plan === plan.name ? (
                <button
                  disabled
                  className="w-full mt-4 py-2 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
                >
                  Plan actuel
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.name)}
                  className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {plan.price_eur === 0 ? 'Rétrograder' : 'Choisir'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
