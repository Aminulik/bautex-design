import React from 'react';
import Breadcrumbs from '../../components/Breadcrumbs';
import Reviews from '../../components/Reviews';

const ReviewPage: React.FC = () => {
  return (
    <>
      <Breadcrumbs currentPage='О компании' />
      <Reviews />
    </>
  );
};

export default ReviewPage;
