import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AllRooms.css';
import Navbar from '../../../Components/Navbar/Navbar';

export default function AllRooms() {
    // Initialize the navigate function for routing
    const navigate = useNavigate();

    return (
        <>
        <Navbar />
        <div className="all-rooms-page">
            <h1 className="all-rooms-title">All Rooms</h1>

            <div className="cards-container">
                {/* Card 1: Emergency */}
                <div className="room-card" onClick={() => navigate('/emergency-rooms')}>
                    <div className="card-image-wrapper">
                        <img
                            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800"
                            alt="Emergency Room"
                            className="room-image"
                        />
                    </div>
                    <div className="card-content">
                        <h2>Emergency Rooms</h2>
                        <p>Immediate critical care and rapid trauma response.</p>
                    </div>
                </div>

                {/* Card 2: ICU */}
                <div className="room-card" onClick={() => navigate('/ICUpatient')}>
                    <div className="card-image-wrapper">
                        <img
                            src="https://media.istockphoto.com/id/1282880747/photo/digitally-rendered-image-of-an-empty-hospital-intensive-care-unit.jpg?s=612x612&w=0&k=20&c=cPNnzfgfOvcVMxaj-gWzHnbVLvJT5G3LNIWTKXU7tXg="
                            alt="ICU Room"
                            className="room-image"
                        />
                    </div>
                    <div className="card-content">
                        <h2>ICU Rooms</h2>
                        <p>Intensive care and advanced monitoring units.</p>
                    </div>
                </div>

                {/* Card 3: Standard Rooms */}
                <div className="room-card" onClick={() => navigate('/RoomsPatient')}>
                    <div className="card-image-wrapper">
                        <img
                            src="https://media.istockphoto.com/id/1364971557/photo/hospital-recovery-room-with-beds-and-chairs-3d-rendering.jpg?s=612x612&w=0&k=20&c=qpLCCYKBxWiVpV74zLbsV69Trb0ga8plCIsx7h7CLAw="
                            alt="Standard Room"
                            className="room-image"
                        />
                    </div>
                    <div className="card-content">
                        <h2>Standard Rooms</h2>
                        <p>General patient wards and specialized liver/kidney recovery units.</p>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}