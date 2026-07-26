import React from 'react';
import '../../pages/Projects/projects.css';

interface ProjectItemProps {
  image: string;
  title: string;
  onClick: () => void;
}

const ProjectItem: React.FC<ProjectItemProps> = ({ image, title, onClick }) => (
  <div className='project-item' onClick={onClick}>
    <img src={image} alt={title} className='project-image' />
    <div className='project-overlay'>
      <div className='project-title'>{title}</div>
    </div>
  </div>
);

export default ProjectItem;
