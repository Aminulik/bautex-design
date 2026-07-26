import React from 'react';
import ProjectItem from './ProjectsItem';

interface Project {
  id: number;
  image: string;
  title: string;
}

interface ProjectsGridProps {
  projects: Project[];
  onProjectClick: (title: string) => void;
}

const ProjectsGrid: React.FC<ProjectsGridProps> = ({ projects, onProjectClick }) => {
  return (
    <div className='projects-grid'>
      {projects.map((project) => (
        <ProjectItem
          key={project.id}
          image={project.image}
          title={project.title}
          onClick={() => onProjectClick(project.title)}
        />
      ))}
    </div>
  );
};

export default ProjectsGrid;
