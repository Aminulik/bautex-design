import React from 'react';

type InstructionIconProps = {
  className?: string;
};

const iconProps = {
  width: 64,
  height: 64,
  viewBox: '0 0 64 64',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
};

export const GlueBucketIcon: React.FC<InstructionIconProps> = ({ className }) => (
  <svg {...iconProps} className={className} aria-hidden='true'>
    <path
      d='M18 24H46L42.5 52H21.5L18 24Z'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinejoin='round'
    />
    <path
      d='M23 24V19C23 14.58 27.03 11 32 11C36.97 11 41 14.58 41 19V24'
      stroke='currentColor'
      strokeWidth='2'
    />
    <path d='M16 24H48' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
    <path d='M24 36H40' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
  </svg>
);

export const ClockIcon: React.FC<InstructionIconProps> = ({ className }) => (
  <svg {...iconProps} className={className} aria-hidden='true'>
    <circle cx='32' cy='32' r='20' stroke='currentColor' strokeWidth='2' />
    <path
      d='M32 19V33L41 38'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M18 12L13 17M46 12L51 17'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
);

export const BrushIcon: React.FC<InstructionIconProps> = ({ className }) => (
  <svg {...iconProps} className={className} aria-hidden='true'>
    <path d='M19 14H45V31H19V14Z' stroke='currentColor' strokeWidth='2' strokeLinejoin='round' />
    <path d='M19 22H45' stroke='currentColor' strokeWidth='2' />
    <path
      d='M29 31V47C29 50.31 31.69 53 35 53C38.31 53 41 50.31 41 47V31'
      stroke='currentColor'
      strokeWidth='2'
    />
    <path d='M27 14V24M37 14V24' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
  </svg>
);

export const RollerIcon: React.FC<InstructionIconProps> = ({ className }) => (
  <svg {...iconProps} className={className} aria-hidden='true'>
    <rect x='10' y='16' width='35' height='10' rx='3' stroke='currentColor' strokeWidth='2' />
    <path
      d='M45 21H51C53.21 21 55 22.79 55 25V29C55 31.21 53.21 33 51 33H35C32.79 33 31 34.79 31 37V45'
      stroke='currentColor'
      strokeWidth='2'
    />
    <path d='M27 45H35V56H27V45Z' stroke='currentColor' strokeWidth='2' strokeLinejoin='round' />
  </svg>
);

export const KnifeIcon: React.FC<InstructionIconProps> = ({ className }) => (
  <svg {...iconProps} className={className} aria-hidden='true'>
    <path
      d='M38 8L50 20L25 45L13 49L17 37L38 8Z'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinejoin='round'
    />
    <path d='M35 13L45 23' stroke='currentColor' strokeWidth='2' />
    <path d='M17 37L25 45' stroke='currentColor' strokeWidth='2' />
  </svg>
);

export const SpatulaIcon: React.FC<InstructionIconProps> = ({ className }) => (
  <svg {...iconProps} className={className} aria-hidden='true'>
    <path
      d='M20 11H44V24C44 30.63 38.63 36 32 36C25.37 36 20 30.63 20 24V11Z'
      stroke='currentColor'
      strokeWidth='2'
    />
    <path d='M32 36V54' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
    <path d='M27 54H37' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
    <path d='M24 20H40' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
  </svg>
);

export const TextureIcon: React.FC<InstructionIconProps> = ({ className }) => (
  <svg {...iconProps} className={className} aria-hidden='true'>
    <rect x='12' y='14' width='40' height='36' rx='5' stroke='currentColor' strokeWidth='2' />
    <path
      d='M18 26C23 22 27 30 32 26C37 22 41 30 46 26'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
    <path
      d='M18 36C23 32 27 40 32 36C37 32 41 40 46 36'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
);

export const DropIcon: React.FC<InstructionIconProps> = ({ className }) => (
  <svg {...iconProps} className={className} aria-hidden='true'>
    <path
      d='M32 8C32 8 48 26.17 48 39C48 48.39 40.84 55 32 55C23.16 55 16 48.39 16 39C16 26.17 32 8 32 8Z'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinejoin='round'
    />
    <path
      d='M25 40C25 44.42 28.58 48 33 48'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
);
