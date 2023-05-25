import { useState } from "react";
import styled, { keyframes } from "styled-components";

export default function Home() {
    const [url, setUrl] = useState("");
    const [urlParams, setUrlParams] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        const response = await fetch(`/api/parseIt?url=${url}`);
        const result = await response.json();
        setIsLoading(false);
        if (result.err_no === 0) {
            const data = result.data;
            setUrlParams(data);
        } else {
            setErrorMsg(result.err_msg);
        }
    };

    return (
        <Container>
            <Title>URL Parser</Title>
            <Form onSubmit={handleSubmit}>
                <Input
                    type="text"
                    placeholder="Enter URL"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                />
                <Button type="submit">Submit</Button>
                {isLoading && <Loading />}
            </Form>
            {urlParams ? (
                <Table>
                    <thead>
                        <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(urlParams).map(([key, value]) => (
                            <tr key={key}>
                                <td>{key}</td>
                                <td>{value}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            ) : (
                <ErrorMsg>{errorMsg}</ErrorMsg>
            )}
        </Container>
    );
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const Loading = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  padding: 20px;
  border: 5px solid #ccc;
  border-top-color: #0070f3;
  animation: ${spin} 1s ease-in-out infinite;
  margin-left: 10px;
`;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 50px;
`;

const Title = styled.h1`
    font-size: 36px;
    font-weight: bold;
    margin-bottom: 20px;
`;

const Form = styled.form`
    display: flex;
    align-items: center;
    margin-bottom: 50px;
`;

const Input = styled.input`
    width: 400px;
    height: 40px;
    border: none;
    border-radius: 5px;
    padding: 10px;
    margin-right: 10px;
    font-size: 16px;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.2s ease-in-out;
`;

const Button = styled.button`
    height: 60px;
    border: none;
    border-radius: 5px;
    padding: 10px 20px;
    font-size: 16px;
    font-weight: bold;
    color: #fff;
    background-color: #0070f3;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
    transition: background-color 0.2s ease-in-out;

    &:hover {
        cursor: pointer;
        background-color: #0060d9;
    }
`;

const Table = styled.table`
    overflow-x: auto;
    border-collapse: collapse;
    width: 80%;
    max-width: 800px;
    margin-top: 50px;
    font-size: 16px;
    text-align: left;

    th,
    td {
    padding: 10px;
    border: 1px solid #ddd;
    }

    th {
    background-color: #f2f2f2;
    font-weight: bold;
    }

    td:first-child {
    white-space: nowrap;
    }

    td:last-child {
    white-space: pre-wrap;
    word-break: break-word;
    }
`;

const ErrorMsg = styled.div`
  color: red;
  font-weight: bold;
  margin-top: 10px;
  display: inline-block;
  width: 80%;
`;