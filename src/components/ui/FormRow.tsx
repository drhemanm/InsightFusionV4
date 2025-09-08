import React from 'react';

interface Props {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}

export const FormRow: React.FC<Props> = ({ children, cols = 1 }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[cols]} gap-4`}>
      {children}
    </div>
  );
};