import type { ReactNode } from 'react';
import '../app/admin-login/style.css';
export default function CustomerAuthShell({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){
  return <main className="cp-login"><div className="cp-login-scene" aria-hidden="true"><img src="/hookah-hero.webp" alt="" fetchPriority="high"/><div className="cp-login-smoke"><img src="/hookah-hero.webp" alt=""/></div></div>
    <div className="cp-login-content"><header><img src="/chill-pipe-logo.webp" alt="The Chill Pipe"/><span>YOUR ACCOUNT</span></header>
      <section aria-labelledby="customer-heading"><h1 id="customer-heading">{title}</h1><p>{subtitle}</p>{children}</section>
      <a className="cp-login-back" href="/">Back to The Chill Pipe</a><label className="cp-login-motion"><input type="checkbox" id="pause-login-smoke"/>Pause smoke</label>
    </div></main>;
}
