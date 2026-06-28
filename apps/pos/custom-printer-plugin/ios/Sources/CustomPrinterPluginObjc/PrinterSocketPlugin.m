#import <Capacitor/Capacitor.h>

CAP_PLUGIN(PrinterSocketPlugin, "PrinterSocket",
    CAP_PLUGIN_METHOD(send, CAPPluginReturnPromise);
)
