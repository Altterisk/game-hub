import { createRoot, hydrateRoot } from 'react-dom/client';
import { Landing } from './Landing';
import '../styles/hub.css';
import '../styles/base.css';
import '../styles/components.css';
import './hub.css';

const root = document.getElementById('root')!;
if (root.hasChildNodes()) hydrateRoot(root, <Landing />);
else createRoot(root).render(<Landing />);
