import React from 'react';

const RightMainPanel = () => {
    return (
        <div className='right-main-panel'>
            <h3>Colleagues</h3>
            <hr className='divider'/>
            <input
                type="text"
                placeholder="Search a colleague..."
                className='search-colleague'
            />
            <h3 style={{ marginTop: '2rem' }}>Requests</h3>
            <hr className='divider'/>
        </div>
    );
};

export default RightMainPanel;
