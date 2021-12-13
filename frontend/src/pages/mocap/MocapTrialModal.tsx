import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Modal, Button, Spinner, Table } from "react-bootstrap";
import RawFileDisplay from "../../components/RawFileDisplay";
import { observer } from "mobx-react-lite";
import MocapS3Cursor from '../../state/MocapS3Cursor';

type MocapTrialModalProps = {
    cursor: MocapS3Cursor;
};

type ProcessingResultsJSON = {
    autoAvgMax: number;
    autoAvgRMSE: number;
    goldAvgMax: number;
    goldAvgRMSE: number;
};

type MocapTrialEntry = {
    key: string;
    lastModified: Date;
    size: number;
};

const MocapTrialModal = observer((props: MocapTrialModalProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const standalone = useRef(null as null | any);
    const [logText, setLogText] = useState('');
    const [resultsJson, setResultsJson] = useState({} as ProcessingResultsJSON);

    let show = location.search.startsWith("?show-trial=");
    let trialNumber: number = 0;
    let trialStatus = 'empty'
    let trial: MocapTrialEntry | null = null;
    if (show) {
        trialNumber = parseInt(decodeURIComponent(location.search.substring("?show-trial=".length)));
        trial = props.cursor.getTrials()[trialNumber];
        if (trial != null) {
            trialStatus = props.cursor.getTrialStatus(trial.key);
        }
    }

    useEffect(() => {
        if (show && trial != null) {
            props.cursor.getLogFileText(trial.key).then((text: string) => {
                setLogText(text);
            }).catch(() => {

            });
            props.cursor.getResultsFileText(trial.key).then((text: string) => {
                setResultsJson(JSON.parse(text));
            }).catch(() => { });
        }
    }, [trialNumber, show, trialStatus]);

    if (!show || trial == null) {
        return <></>;
    }

    let hideModal = () => {
        if (standalone.current != null) {
            standalone.current.dispose();
            standalone.current = null;
        }
        navigate({ search: "" });
    };


    let body = null;
    if (trialStatus === 'empty') {

    }
    else if (trialStatus === 'could-process') {
        body = (
            <div className="MocapView">
                <h2>Status: Ready to process</h2>
                <Button size="lg" onClick={() => props.cursor.markTrialReadyForProcessing(trial?.key ?? '')}>Process</Button>
            </div>
        );
    }
    else if (trialStatus === 'waiting') {
        body = (
            <div className="MocapView">
                <h2>Waiting to be assigned a processing server...</h2>
                <p>
                    We have a number of servers that process uploaded tasks one at a
                    time. It shouldn't take long to get assigned a server, but when we
                    get lots of uploads at once, the servers may be busy for a while.
                </p>
            </div>
        );
    }
    else if (trialStatus === 'processing') {
        body = (
            <div className="MocapView">
                <h2>Status: Processing</h2>
            </div>
        );
    }
    else if (trialStatus === 'done') {
        body = (
            <div className="MocapView">
                <h2>Results:</h2>
                <div>
                    <Table>
                        <thead>
                            <tr>
                                <td></td>
                                <td>Avg. RMSE</td>
                                <td>Avg. Max</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Manual:</td>
                                <td>{(resultsJson.goldAvgRMSE ?? 0.0).toFixed(2)} cm</td>
                                <td>{(resultsJson.goldAvgMax ?? 0.0).toFixed(2)} cm</td>
                            </tr>
                            <tr>
                                <td>Automatic:</td>
                                <td>{(resultsJson.autoAvgRMSE ?? 0.0).toFixed(2)} cm</td>
                                <td>{(resultsJson.autoAvgMax ?? 0.0).toFixed(2)} cm</td>
                            </tr>
                        </tbody>
                    </Table>
                </div>

                <h2>
                    <i className="mdi mdi-server-network me-1 text-muted vertical-middle"></i>
                    Processing (Autoscale &amp; Autoregister) Log
                </h2>

                <div>
                    <pre>
                        {logText}
                    </pre>
                </div>
            </div>
        );
    }

    return (
        <Modal size="xl" show={show} onHide={hideModal}>
            <Modal.Header closeButton>
                <Modal.Title>
                    <i className="mdi mdi-run me-1"></i> Trial: {trial.key}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>{body}</Modal.Body>
        </Modal>
    );
});

export default MocapTrialModal;
