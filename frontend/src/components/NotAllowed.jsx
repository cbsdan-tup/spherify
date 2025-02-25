import Header from "./layout/Header";

const NotAllowed = () => {
    return (
        <>
        <Header />
        <div id="notFound">
            <h1>Sorry! You are not allowed to access this page!</h1>
            <p className="error text-danger">Not Allowed 401</p>
        </div>
        </>
    )
}

export default NotAllowed;