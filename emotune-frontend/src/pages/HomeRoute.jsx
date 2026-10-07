import { hasScanned } from '../utils/moodSession';
import ScanPage from './ScanPage';
import BrowsePage from './BrowsePage';

// "/": moi lan mo web (phien moi) -> man chao + quet truoc; da quet trong phien nay -> trang chu duyet nhac
const HomeRoute = () => (hasScanned() ? <BrowsePage /> : <ScanPage intro />);

export default HomeRoute
