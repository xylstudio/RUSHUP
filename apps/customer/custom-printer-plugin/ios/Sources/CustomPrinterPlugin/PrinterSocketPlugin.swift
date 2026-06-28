import Foundation
import Capacitor
import Network

@objc(PrinterSocketPlugin)
public class PrinterSocketPlugin: CAPPlugin {
    @objc func send(_ call: CAPPluginCall) {
        guard let ipAddress = call.getString("ipAddress"),
              let portInt = call.getInt("port"),
              let hexData = call.getString("data") else {
            call.reject("Missing ipAddress, port, or data")
            return
        }

        let port = NWEndpoint.Port(integerLiteral: UInt16(portInt))
        let host = NWEndpoint.Host(ipAddress)
        let connection = NWConnection(host: host, port: port, using: .tcp)

        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                var data = Data()
                var hexStr = hexData
                while hexStr.count >= 2 {
                    let index = hexStr.index(hexStr.startIndex, offsetBy: 2)
                    let byteString = String(hexStr[..<index])
                    if let byte = UInt8(byteString, radix: 16) {
                        data.append(byte)
                    }
                    hexStr = String(hexStr[index...])
                }

                connection.send(content: data, completion: .contentProcessed({ sendError in
                    if let error = sendError {
                        call.reject("Send error: \(error)")
                    } else {
                        call.resolve()
                    }
                    connection.cancel()
                }))
            case .failed(let error):
                call.reject("Connection failed: \(error)")
            case .cancelled:
                break
            default:
                break
            }
        }

        connection.start(queue: .global())
    }
}
