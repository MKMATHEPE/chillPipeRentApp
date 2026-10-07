import type { Metadata } from 'next';
import LoginForm from './login-form';
import './style.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Admin sign-in | The Chill Pipe',robots:{index:false,follow:false}};
export default function Login(){return <main className="cp-login">
  <div className="cp-login-scene" aria-hidden="true"><img src="/hookah-hero.webp" alt="" fetchPriority="high"/><div className="cp-login-smoke"><img src="/hookah-hero.webp" alt=""/></div></div>
  <div className="cp-login-content"><header><img src="/chill-pipe-logo.webp" alt="The Chill Pipe"/><span>ADMIN</span></header>
    <section aria-labelledby="login-heading"><h1 id="login-heading">Admin sign in</h1><p>Manage your rentals.</p><LoginForm/></section>
    <a className="cp-login-back" href="/">Back to The Chill Pipe</a>
    <label className="cp-login-motion"><input type="checkbox" id="pause-login-smoke"/>Pause smoke</label>
  </div>
</main>;}
