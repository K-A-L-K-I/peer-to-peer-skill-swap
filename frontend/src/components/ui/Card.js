import React from 'react';
import './Card.css';

const Card = ({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}) => {
  const classes = [
    'card',
    `card-padding-${padding}`,
    hover ? 'card-hover' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
