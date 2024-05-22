import ReactDOM from 'react-dom';

export default function Mounter({ children }) {
    const appRoot = document.getElementById('react-root');
    return ReactDOM.createPortal(children, appRoot);
}
