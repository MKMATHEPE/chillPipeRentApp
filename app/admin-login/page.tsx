import type { Metadata } from 'next';
import LoginForm from './login-form';
import './style.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Admin sign-in | The Chill Pipe',robots:{index:false,follow:false}};
export default function Login(){return <main className="cp-login"><header><img src="/chill-pipe-logo.webp" alt="The Chill Pipe"/><span>ADMIN</span></header><div className="cp-login-hero"><img src="/hookah-hero.webp" alt=""/></div><section><div className="cp-login-handle"/><h1>Welcome back</h1><p>Sign in to manage your rentals.</p><LoginForm/><a className="cp-login-back" href="/">Back to The Chill Pipe</a></section></main>;}
