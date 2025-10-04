import React, { useState } from 'react';

const FamilyForm = ({ people, onSubmit }) => {
    const [partners, setPartners] = useState([]);
    const [children, setChildren] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({ partners, children });
        setPartners([]);
        setChildren([]);
    };

    return (
        <form onSubmit={handleSubmit} className="family-form">
            <h2>Create Family</h2>
            <div className="form-group">
                <label htmlFor="partners">Partners</label>
                {/* In a real app, this would be a multi-select dropdown */}
                <input
                    type="text"
                    id="partners"
                    placeholder="Enter partner IDs, comma-separated"
                    onChange={(e) => setPartners(e.target.value.split(',').map(id => id.trim()))}
                />
            </div>
            <div className="form-group">
                <label htmlFor="children">Children</label>
                {/* In a real app, this would be a multi-select dropdown */}
                <input
                    type="text"
                    id="children"
                    placeholder="Enter children IDs, comma-separated"
                    onChange={(e) => setChildren(e.target.value.split(',').map(id => id.trim()))}
                />
            </div>
            <button type="submit">Create Family</button>
        </form>
    );
};

export default FamilyForm;
