import Navbar from "../../../Components/Navbar/Navbar";
import '../Homepage/Home.css';
import { BsShieldCheck, BsPeopleFill, BsClockHistory } from 'react-icons/bs';
import { GiLiver, GiKidneys } from "react-icons/gi";
import { FaHeartbeat } from "react-icons/fa";
import Marquee from 'react-fast-marquee';
import ChatbotWidget from "../Chatbot/Chatbot";

const medicalFormImage = "/assets/images/3d-illustration-pen-putting-blue-ticks-paper.jpg";

export default function Homepage() {

    const doctorData = [
        {
            id: 1,
            name: 'Dr. Sarah Chen',
            specialization: 'Cardiologist',
            photoUrl: '/assets/images/b997a530822d0f2c03259070d4590d45.jpg',
        },
        {
            id: 2,
            name: 'Dr. John Smith',
            specialization: 'Pediatrician',
            photoUrl: '/assets/images/ai-generative-portrait-of-confident-male-doctor-in-white-coat-and-stethoscope-standing-with-arms-crossed-and-looking-at-camera-photo.jpg',
        },
        {
            id: 3,
            name: 'Dr. Aisha Khan',
            specialization: 'Dermatologist',
            photoUrl: '/assets/images/woman-doctor-wearing-lab-coat-with-stethoscope-isolated_1303-29791.jpg',
        },
        {
            id: 4,
            name: 'Dr. Emilio Rossi',
            specialization: 'Neurologist',
            photoUrl: '/assets/images/healthcare-medical-staff-concept-portrait-600nw-2281024823.webp',
        },
    ];

    const DoctorCard = ({ name, specialization, photoUrl }) => (
        <div className="doctor-card">
            <img src={photoUrl} alt={name} className="doctor-photo" />
            <div className="doctor-info">
                <h3 className="doctor-name">{name}</h3>
                <p className="doctor-spec">{specialization}</p>
            </div>
        </div>
    );

    return (
        <>
            <Navbar />

            {/* 🔥 Advanced Health Awareness Section */}
            <section className="health-awareness-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-subtitle">Stay Safi</span>
                        <h2 className="section-title">Health Awareness</h2>
                        <p className="section-description">
                            Take control of your health with these essential tips for vital organ care
                        </p>
                    </div>

                    <div className="awareness-grid">
                        {/* Heart Care Card */}
                        <div className="awareness-card heart-card">
                            <div className="card-inner">
                                <div className="card-front">
                                    <div className="icon-wrapper heart-icon">
                                        <FaHeartbeat />
                                    </div>
                                    <h3>Heart Care</h3>
                                    <p>Keep your heart healthy with balanced nutrition and regular exercise</p>
                                    <span className="card-tip">❤️ 150 mins weekly exercise</span>
                                </div>
                            </div>
                        </div>

                        {/* Liver Care Card */}
                        <div className="awareness-card liver-card">
                            <div className="card-inner">
                                <div className="card-front">
                                    <div className="icon-wrapper liver-icon">
                                        <GiLiver />
                                    </div>
                                    <h3>Liver Care</h3>
                                    <p>Protect your liver by limiting alcohol and avoiding processed foods</p>
                                    <span className="card-tip">💧 8-10 glasses water daily</span>
                                </div>
                            </div>
                        </div>

                        {/* Kidney Care Card */}
                        <div className="awareness-card kidney-card">
                            <div className="card-inner">
                                <div className="card-front">
                                    <div className="icon-wrapper kidney-icon">
                                        <GiKidneys />
                                    </div>
                                    <h3>Kidney Care</h3>
                                    <p>Maintain healthy kidneys with proper hydration and low sodium intake</p>
                                    <span className="card-tip">🧂 Less than 2,300mg sodium</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Health Stats */}
                    <div className="health-stats">
                        <div className="stat-item">
                            <span className="stat-number">70%</span>
                            <span className="stat-label">of diseases preventable</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">30min</span>
                            <span className="stat-label">daily exercise recommended</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">8+</span>
                            <span className="stat-label">hours of sleep needed</span>
                        </div>
                    </div>
                </div>
            </section>

            <hr className="divider" />

            {/* Trust Section */}
            <section className="trust-section">
                <h2 className="trust-heading">Why You Should Trust Us?</h2>

                <div className="trust-cards-container">

                    <div className="trust-card">
                        <div className="card-icon-wrapper">
                            <BsPeopleFill className="card-icon" />
                        </div>
                        <h3 className="card-title">Expert Doctors</h3>
                        <p className="card-description">
                            We have expert doctors ready to help you anytime.
                        </p>
                    </div>

                    <div className="trust-card">
                        <div className="card-icon-wrapper">
                            <BsShieldCheck className="card-icon" />
                        </div>
                        <h3 className="card-title">Private & Secure</h3>
                        <p className="card-description">
                            Your health data is fully protected and secured.
                        </p>
                    </div>

                    <div className="trust-card">
                        <div className="card-icon-wrapper">
                            <BsClockHistory className="card-icon" />
                        </div>
                        <h3 className="card-title">24/7 Service</h3>
                        <p className="card-description">
                            Available anytime for urgent and routine care.
                        </p>
                    </div>

                </div>
            </section>

            <hr className="divider" />

            {/* Specializations */}
            <section className="specializations-section">
                <h2 className="special-head">Our Specializations</h2>

                <div className="special-cards">

                    <div className="special-card">
                        <div className="icon-circle" style={{ color: '#d05ce3' }}><GiLiver /></div>
                        <h3 className="spec-name">Liver</h3>
                    </div>

                    <div className="special-card">
                        <div className="icon-circle" style={{ color: '#4facfe' }}><GiKidneys /></div>
                        <h3 className="spec-name">Kidney</h3>
                    </div>

                    <div className="special-card">
                        <div className="icon-circle" style={{ color: '#ff6b6b' }}><FaHeartbeat /></div>
                        <h3 className="spec-name">Heart</h3>
                    </div>

                </div>
            </section>

            <hr className="divider" />

            {/* Doctors
            <div className="marquee-container">
                <h2 className="marquee-title">Meet Our Top Specialists</h2>

                <Marquee speed={120} pauseOnHover={true}>
                    {doctorData.map((doctor) => (
                        <DoctorCard key={doctor.id} {...doctor} />
                    ))}
                </Marquee>
            </div> */}

            <ChatbotWidget />

        </>
    )
}