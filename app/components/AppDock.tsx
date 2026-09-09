import { CircleHelp, Home, PackageSearch, ScrollText } from 'lucide-react';

export default function AppDock({active}:{active:'home'|'track'|'terms'|'help'}){
  const links=[
    {id:'home',href:'/',label:'Order',Icon:Home},
    {id:'track',href:'/track',label:'Track',Icon:PackageSearch},
    {id:'terms',href:'/terms',label:'Terms',Icon:ScrollText},
    {id:'help',href:'/how-it-works',label:'Help',Icon:CircleHelp},
  ] as const;
  return <nav className="app-dock" aria-label="App navigation">{links.map(({id,href,label,Icon})=><a key={id} href={href} className={active===id?'active':''}><Icon/><span>{label}</span></a>)}</nav>;
}
