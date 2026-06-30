import { useEffect, useRef } from 'react';

interface Props {
  onCredential: (credential: string) => void;
}

declare global {
  interface Window { google?: any; }
}

export default function GoogleSignInButton({ onCredential }: Props) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = 'google-gsi';
    const init = () => {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (resp: { credential: string }) => onCredential(resp.credential),
      });
      window.google.accounts.id.renderButton(divRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 320,
      });
    };

    if (document.getElementById(scriptId)) {
      init();
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [onCredential]);

  return <div ref={divRef} className="flex justify-center" />;
}