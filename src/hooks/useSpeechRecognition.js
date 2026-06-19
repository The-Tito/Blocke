/**
 * hooks/useSpeechRecognition — envoltura del Web Speech API del navegador.
 *
 * Permite "dictar" por voz las actividades del día. Degrada con elegancia: si el
 * navegador no soporta SpeechRecognition (p. ej. Firefox), `supported` es false y
 * la UI cae a la entrada por texto. El reconocimiento es del lado del cliente; no
 * se envía audio a ningún servidor de Bloque.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

/**
 * @param {{ lang?: string, onResult?: (finalText: string) => void }} [opts]
 * @returns {{ supported: boolean, listening: boolean, interim: string,
 *             error: string, start: () => void, stop: () => void }}
 */
export function useSpeechRecognition({ lang = 'es-ES', onResult } = {}) {
  const supported = Boolean(SpeechRecognition);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!supported) return undefined;
    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          onResultRef.current?.(transcript.trim());
        } else {
          interimText += transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = (event) => {
      // 'no-speech'/'aborted' son fines normales (silencio o parar): no son fallos.
      if (event.error === 'no-speech' || event.error === 'aborted') {
        setListening(false);
        return;
      }
      const messages = {
        'not-allowed': 'Permiso de micrófono denegado. Habilítalo en el navegador.',
        'service-not-allowed':
          'El dictado por voz no está disponible en este navegador (Brave/Firefox lo bloquean). Escribe a mano o usa Chrome.',
        network:
          'El dictado por voz no está disponible en este navegador (Brave/Firefox lo bloquean). Escribe a mano o usa Chrome.',
        'audio-capture': 'No se detectó micrófono. Conéctalo o escribe a mano.',
      };
      setError(messages[event.error] ?? 'No se pudo capturar la voz. Escribe a mano.');
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch (_e) {
        // ya detenido
      }
    };
  }, [supported, lang]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    setError('');
    setInterim('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (_e) {
      // start() lanza si ya estaba activo; lo ignoramos.
    }
  }, [listening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, interim, error, start, stop };
}
