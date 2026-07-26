import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import Slider from './components/Slider';
import FabricsSection from './components/FabricsSection';
import Footer from './components/Footer';
import LocationMap from './components/LocationMap';
import './styles/app.css';
import './styles/header.css';
import './styles/hero.css';
import './styles/features.css';
import './styles/slider.css';
import './styles/fabrics.css';
import './pages/AboutCompany/about-company.css';
import './pages/Projects/projects.css';
import './pages/HowToPaint/how-to-paint.css';
import './pages/Catalog/collections/collections.css';
import './pages/Certificates/certificates.css';
import './styles/location-map.css';
import Reviews from './components/Reviews';
import ScrollToTop from './components/ScrollToTop';
import { fetchFavorites } from './store/favoritesSlice';
import type { AppDispatch, RootState } from './store';
import { ChatWidget } from './components/ChatWidget/ChatWidget';

const AboutCompany = lazy(() => import('./pages/AboutCompany/AboutCompany'));
const Projects = lazy(() => import('./pages/Projects/Projects'));
const HowToPaint = lazy(() => import('./pages/HowToPaint/HowToPaint'));
const HowToGlue = lazy(() => import('./pages/HowToGlue/HowToGlue'));
const Basic = lazy(() => import('./pages/Catalog/collections/Basic'));
const Loft = lazy(() => import('./pages/Catalog/collections/Loft'));
const Geometry = lazy(() => import('./pages/Catalog/collections/Geometry'));
const Minimalism = lazy(() => import('./pages/Catalog/collections/Minimalism'));
const Classic = lazy(() => import('./pages/Catalog/collections/Classic'));
const Kids = lazy(() => import('./pages/Catalog/collections/Kids'));
const Certificates = lazy(() => import('./pages/Certificates/Certificates'));
const Account = lazy(() => import('./pages/Account/Account'));
const Catalog = lazy(() => import('./pages/Catalog/Catalog'));
const Favorites = lazy(() => import('./pages/Favorites/Favorites'));
const Visualization = lazy(() => import('./pages/Visualization/Visualization'));
const VisualizationPipeline = lazy(
  () => import('./pages/VisualizationPipeline/VisualizationPipeline')
);
const MlMetrics = lazy(() => import('./pages/MlMetrics/MlMetrics'));
const WhereToBuy = lazy(() => import('./pages/WhereToBuy/WhereToBuy'));
const ReviewPage = lazy(() => import('./pages/Reviews/Review-page'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy/PrivacyPolicy'));
const AiChatPage = lazy(() =>
  import('./pages/AiChatPage/AiChatPage').then((module) => ({ default: module.AiChatPage }))
);
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

const HomePage = () => (
  <main className='home-page'>
    <Hero />
    <Features />
    <Slider />
    <FabricsSection />
    <div className='container'>
      <LocationMap />
    </div>
    <Reviews />
  </main>
);

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(fetchFavorites());
  }, [user, dispatch]);

  // basename берётся из того же PUBLIC_PATH, что и publicPath сборки,
  // поэтому роутер и пути к ассетам не могут разъехаться.
  // '/' -> '', '/bautex-design/' -> '/bautex-design'
  const basename = (process.env.PUBLIC_PATH || '/').replace(/\/+$/, '');

  return (
    <Router basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <div className='app'>
        <Header />

        <Suspense fallback={<div className='route-loading'>Loading...</div>}>
          <Routes>
            <Route path='/' element={<HomePage />} />
            <Route path='/about/reviews' element={<ReviewPage />} />
            <Route path='/about/company' element={<AboutCompany />} />
            <Route path='/about/projects' element={<Projects />} />
            <Route path='/about/certificates' element={<Certificates />} />
            <Route path='/account' element={<Account />} />
            <Route path='/catalog' element={<Catalog />} />
            <Route path='/favorites' element={<Favorites />} />
            <Route path='/visualization' element={<Visualization />} />
            <Route path='/visualization/how-it-works' element={<VisualizationPipeline />} />
            <Route path='/ml-metrics' element={<MlMetrics />} />
            <Route path='/info/how-to-paint' element={<HowToPaint />} />
            <Route path='/info/how-to-paste' element={<HowToGlue />} />
            <Route path='/info/how-to-glue' element={<HowToGlue />} />
            <Route path='/collections/basic' element={<Basic />} />
            <Route path='/collections/loft' element={<Loft />} />
            <Route path='/collections/geometry' element={<Geometry />} />
            <Route path='/collections/minimalism' element={<Minimalism />} />
            <Route path='/collections/classic' element={<Classic />} />
            <Route path='/collections/kids' element={<Kids />} />
            <Route path='/where-to-buy' element={<WhereToBuy />} />
            <Route path='/privacy-policy' element={<PrivacyPolicy />} />
            <Route path='/ai-chat' element={<AiChatPage />} />
            <Route path='*' element={<NotFound />} />
          </Routes>
        </Suspense>

        <Footer />
        <ChatWidget />
      </div>
    </Router>
  );
};

export default App;
