/* eslint-disable no-unused-vars */
import { Component } from "react";
import PropTypes from "prop-types";

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.log("Error caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "20px", textAlign: "center" }}>
                    <h2>Something went wrong.</h2>
                    <button onClick={() => window.location.reload()}>
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
ErrorBoundary.propTypes = {
    children: PropTypes.node,
};

export default ErrorBoundary;
