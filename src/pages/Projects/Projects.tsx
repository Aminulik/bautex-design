import React, { useState } from 'react';
import ProjectsGrid from '../../components/projects/ProjectsGrid';
import './projects.css';
import Breadcrumbs from '../../components/Breadcrumbs';
import DevNoticeModal from '../../components/DevNoticeModal';

import project1 from '../../assets/project1.jpg';
import project2 from '../../assets/project2.jpg';
import project3 from '../../assets/project3.jpg';

const Projects: React.FC = () => {
  const [showDevNotice, setShowDevNotice] = useState(false);

  const projects = [
    {
      id: 1,
      image: project1,
      title: 'Аппартаменты на юге Москвы',
    },
    {
      id: 2,
      image: project2,
      title: 'Детская комната в Самаре',
    },
    {
      id: 3,
      image: project3,
      title: 'Загородный дом во Владимире',
    },
    {
      id: 4,
      image: project1,
      title: 'Аппартаменты на юге Москвы',
    },
    {
      id: 5,
      image: project2,
      title: 'Детская комната в Самаре',
    },
    {
      id: 6,
      image: project3,
      title: 'Загородный дом во Владимире',
    },
  ];

  const handleProjectClick = () => {
    setShowDevNotice(true);
  };

  return (
    <main>
      <Breadcrumbs currentPage='Проекты' />

      <h1 className='projects-title'>Реализованные проекты</h1>

      <div className='main-container'>
        <ProjectsGrid projects={projects} onProjectClick={handleProjectClick} />
      </div>

      {showDevNotice && <DevNoticeModal onClose={() => setShowDevNotice(false)} />}
    </main>
  );
};

export default Projects;
