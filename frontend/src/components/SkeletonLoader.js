import React from 'react';
import './Skeleton.css';

export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '8px', className = '' }) => {
    return (
        <div
            className={`skeleton-box ${className}`}
            style={{ width, height, borderRadius }}
        />
    );
};

export const SkeletonCircle = ({ size = '48px', className = '' }) => {
    return (
        <div
            className={`skeleton-circle ${className}`}
            style={{ width: size, height: size }}
        />
    );
};

export const SkeletonText = ({ lines = 1, width = '100%', lastLineWidth = '70%', className = '' }) => {
    const lineArray = Array.from({ length: lines });

    return (
        <div className={`skeleton-text-container ${className}`}>
            {lineArray.map((_, index) => (
                <div
                    key={index}
                    className="skeleton-text-line"
                    style={{ width: index === lineArray.length - 1 && lines > 1 ? lastLineWidth : width }}
                />
            ))}
        </div>
    );
};

export const SkeletonUserCard = () => {
    return (
        <div className="skeleton-user-card">
            <div className="skeleton-card-header">
                <SkeletonCircle size="64px" />
                <div className="skeleton-header-info">
                    <SkeletonText lines={2} width="120px" lastLineWidth="80px" />
                </div>
            </div>
            <div className="skeleton-card-body">
                <SkeletonBox height="24px" width="40%" className="skeleton-tags-label" />
                <div className="skeleton-tags">
                    <SkeletonBox width="60px" height="28px" borderRadius="14px" />
                    <SkeletonBox width="80px" height="28px" borderRadius="14px" />
                    <SkeletonBox width="50px" height="28px" borderRadius="14px" />
                </div>
                <SkeletonBox height="24px" width="40%" className="skeleton-tags-label" />
                <div className="skeleton-tags">
                    <SkeletonBox width="70px" height="28px" borderRadius="14px" />
                    <SkeletonBox width="90px" height="28px" borderRadius="14px" />
                </div>
            </div>
            <div className="skeleton-card-footer">
                <SkeletonBox width="100%" height="48px" borderRadius="12px" />
            </div>
        </div>
    );
};
