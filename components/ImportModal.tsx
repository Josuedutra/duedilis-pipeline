
import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { parseSkillJson } from '../services/importer';
import { Proposta } from '../types';
import { formatCurrency, formatDate } from '../constants';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: Partial<Proposta>) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<Proposta> | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  if (!isOpen) return null;

  const handleValidate = () => {
    setIsValidating(true);
    setError(null);
    setPreview(null);
    
    setTimeout(() => {
      try {
        const parsed = parseSkillJson(jsonText);
        setPreview(parsed);
      } catch (err: any) {
        setError(err.message || 'Erro ao processar JSON.');
      } finally {
        setIsValidating(false);
      }
    }, 600);
  };

  const isComplete = preview && preview.referencia_concurso && preview.objeto && preview.entidade_contratante;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-800">Importar Proposta via JSON</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Cole o JSON exportado pela Skill:</label>
            <textarea
              className="w-full h-48 p-4 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder='{ "tipo_export": "proposta_completa", ... }'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleValidate}
              disabled={!jsonText || isValidating}
              className="px-6 py-2 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isValidating ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              <span>{isValidating ? 'Validando...' : 'Validar JSON'}</span>
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-700">
              <AlertTriangle size={20} className="mt-0.5" />
              <div>
                <p className="font-bold">JSON Inválido</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {preview && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-center space-x-3 text-green-700 mb-4">
                <CheckCircle2 size={20} />
                <p className="font-bold">JSON Válido! Pré-visualização:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Referência</p>
                  <p className="font-medium text-slate-900">{preview.referencia_concurso || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Entidade</p>
                  <p className="font-medium text-slate-900">{preview.entidade_contratante || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Valor Proposto</p>
                  <p className="font-medium text-slate-900">{preview.valor_proposto ? formatCurrency(preview.valor_proposto) : 'Manual'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Prazo Submissão</p>
                  <p className="font-medium text-slate-900">{preview.data_limite_submissao ? formatDate(preview.data_limite_submissao) : '-'}</p>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Objeto</p>
                  <p className="font-medium text-slate-900 line-clamp-2">{preview.objeto || '-'}</p>
                </div>
              </div>

              {!isComplete && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start space-x-3 text-amber-800">
                  <AlertTriangle size={20} className="mt-0.5" />
                  <div>
                    <p className="font-bold">Dados Incompletos</p>
                    <p className="text-sm">O JSON é de uma fase inicial. Os dados financeiros e PDFs deverão ser preenchidos manualmente após a importação.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end space-x-3 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={() => preview && onConfirm(preview)}
            disabled={!preview}
            className="px-8 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
          >
            Confirmar e Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
