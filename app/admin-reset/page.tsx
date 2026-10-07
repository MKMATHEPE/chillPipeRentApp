import type { Metadata } from 'next';
import ResetForm from './reset-form';
import '../admin-login/style.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Set your password | The Chill Pipe',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function ResetPage(){return <main className="cp-login"><div className="cp-login-scene" aria-hidden="true"><img src="/hookah-hero.webp" alt=""/></div><div className="cp-login-content"><header><img src="/chill-pipe-logo.webp" alt="The Chill Pipe"/><span>ADMIN</span></header><section><h1>Set your password</h1><ResetForm/></section><a className="cp-login-back" href="/admin-login">Back to sign in</a></div></main>;}
