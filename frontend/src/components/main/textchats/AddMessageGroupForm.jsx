import React, { useState, useEffect } from 'react';
import { fetchTeamMembers } from '../../../functions/TeamFunctions';
import './AddMessageGroupForm.css';
import { useSelector } from 'react-redux';
import { getUser } from '../../../utils/helper';

const AddMessageGroupForm = ({ isOpen, onClose, onSubmit }) => {
    const [groupName, setGroupName] = useState('');
    const [members, setMembers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [errors, setErrors] = useState({});

    const currentTeamId = useSelector((state) => state.team.currentTeamId);
    const authState = useSelector((state) => state.auth);

    if (!isOpen) return null;
    
    useEffect(() => {
        const fetchMembers = async () => {
            const teamMembers = await fetchTeamMembers(currentTeamId, authState);
            setMembers(teamMembers);
        };
        fetchMembers();
        console.log(members);
    }, [currentTeamId]);

    const handleGroupNameChange = (e) => {
        setGroupName(e.target.value);
    };

    const handleMemberChange = (e) => {
        const memberId = e.target.value;
        setSelectedMembers((prevSelected) =>
            prevSelected.includes(memberId)
                ? prevSelected.filter((id) => id !== memberId)
                : [...prevSelected, memberId]
        );
    };

    const validateForm = () => {
        const newErrors = {};
        if (!groupName) {
            newErrors.groupName = 'Group name is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        
        e.preventDefault();
        const formData = {
            teamId: currentTeamId,
            name: groupName,
            members: selectedMembers,
            createdBy: getUser(authState)._id
        };
        if (validateForm()) {
            onSubmit(formData);
            onClose();
        }
    };


    if (!isOpen) return null;

    return (
        <div className="modal-custom">
            <div className="modal-content">
                <span className="close" onClick={onClose}>&times;</span>
                <h2>Add Message Group</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="groupName">Group Name</label>
                        <input
                            type="text"
                            id="groupName"
                            value={groupName}
                            onChange={handleGroupNameChange}
                        />
                        {errors.groupName && <span className="error">{errors.groupName}</span>}
                    </div>
                    <div className="form-group">
                        <label>Members</label>
                        {members.map((member) => (
                            <div key={member._id} className="checkbox">
                                <label>
                                    <input
                                        type="checkbox"
                                        value={member._id}
                                        checked={selectedMembers.includes(member._id)}
                                        onChange={handleMemberChange}
                                    />
                                    {member?.nickname} 
                                </label>
                            </div>
                        ))}
                    </div>
                    <button type="submit">Add Group</button>
                </form>
            </div>
        </div>
    );
};

export default AddMessageGroupForm;