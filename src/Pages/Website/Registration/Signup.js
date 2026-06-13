import { useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../../Config/axios"
import { toast, ToastContainer } from "react-toastify";
import './Register.css';

export default function Signup() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    DateOfBirth: "",
    gender: "",
    hasSugar: false,
    hasPressure: false,
    image: null,
  });


  function handleChange(e) {
    const { name, value, type, files, checked } = e.target;

    if (type === "file") {
      setForm({ ...form, [name]: files[0] });
    } else if (type === "checkbox") {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (form.username.trim() === "") return toast.error("Enter Your Username");
    if (form.email.trim() === "") return toast.error("Enter Your email");
    if (form.phone.trim() === "") return toast.error("Enter Your Phone Number");
    if (form.password.trim() === "") return toast.error("Enter Your Password");
    if (form.DateOfBirth.trim() === "") return toast.error("Enter Your Date Of Birth");
    if (form.gender.trim() === "") return toast.error("Enter Your Gender");
    if (!form.image) return toast.error("Please upload an image");

    if (form.username.length < 3) return toast.error("Name must be more than 2 characters");
    if (form.phone.length < 11) return toast.error("Phone number must be 11 digits");
    if (form.password.length < 9) return toast.error("Password should be 9 characters or more");

    const {
      username,
      email,
      phone,
      password,
      DateOfBirth,
      gender,
      image,
      hasSugar,
      hasPressure
    } = form;

    const requestData = new FormData();

    requestData.append("username", username);
    requestData.append("email", email);
    requestData.append("Password", password);
    requestData.append("Phone", phone);
    requestData.append("DateOfBirth", DateOfBirth);
    requestData.append("Gender", gender);
    requestData.append("hasSugar", hasSugar ? "true" : "false");
    requestData.append("hasPressure", hasPressure ? "true" : "false");
    requestData.append("History", "No history provided");

    if (image) {
      requestData.append("Image", image);
    }

    try {
      const response = await axiosInstance.post(
        "/api/Accounts/SignupAsaUser",
        requestData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        toast.success("You signed up successfully.", {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });

        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }

    } catch (error) {
      console.log(error);

      if (error.response) {
        toast.error(
          `Signup failed: ${error.response.data.message || "Unknown error"}`,
          {
            position: "bottom-center",
            duration: 4000,
            style: {
              backgroundColor: "black",
              color: "white",
              width: "fit-content",
            },
          }
        );
      } else {
        toast.error("Unknown error occurred", {
          position: "top-center",
          duration: 4000,
          style: {
            backgroundColor: "black",
            color: "white",
            width: "fit-content",
          },
        });
      }
    }
  }


  return (

    <div className="split-layout-wrapper">

      <div className="layout-image-side">

      </div>

      <div className="register-container">
        <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable stacked />

        <form className="register-form" onSubmit={handleSubmit}>
          <h2 className="register-form-title">Create Your Account</h2>

          <label>Username</label>
          <input type="text" name="username" value={form.username} onChange={handleChange} placeholder="Enter Your Username" />

          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter Your Email" />

          <label>Phone Number</label>
          <input type="number" name="phone" value={form.phone} onChange={handleChange} placeholder="Enter Your Phone Number" />

          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Enter Your Password" />

          <label>DateOfBirth</label>
          <input type="date" name="DateOfBirth" value={form.DateOfBirth} onChange={handleChange} placeholder="Enter Your Date Of Birth" />

          <label>Gender
            <label>
              <input
                type="radio"
                name="gender"
                value="Male"
                checked={form.gender === "Male"}
                onChange={handleChange}
              />
              Male
            </label>

            <label>
              <input
                type="radio"
                name="gender"
                value="Female"
                checked={form.gender === "Female"}
                onChange={handleChange}
              />
              Female
            </label>
          </label>

          <label>
            <input
              type="checkbox"
              name="hasPressure"
              checked={form.hasPressure}
              onChange={handleChange}
            />
            Has Pressure
          </label>

          <label>
            <input
              type="checkbox"
              name="hasSugar"
              checked={form.hasSugar}
              onChange={handleChange}
            />
            Has Sugar
          </label>

          <label>Profile Image</label>
          <input type="file" name="image" onChange={handleChange} />




          <button className="button" type="submit">Signup</button>

          <Link to="/Login" className="form-link">Already have an Account?</Link>
        </form>
      </div>
    </div>

  );
}